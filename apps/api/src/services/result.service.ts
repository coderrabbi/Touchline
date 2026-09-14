import {playerSelect} from './read.service.js';
import {finishCompetition} from './lifecycle.service.js';
import type { ScoreInput } from "@touchline/shared";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/errors.js";
import { transaction } from "./transaction.js";
import { calculateStandings, winner } from "./competition-engine.js";

import { audit } from "./tournament.service.js";
const relations = {
  home: {
    include: { user: { select: playerSelect } },
  },
  away: {
    include: { user: { select: playerSelect } },
  },
  tournament: true,
} as const;
export async function submit(userId: string, id: string, score: ScoreInput) {
  return transaction(async (tx) => {
    const m = await tx.match.findUnique({ where: { id }, include: relations });
    if (!m || ![m.home?.userId, m.away?.userId].includes(userId))
      throw new AppError(403, "Only match participants can submit results.");
    if (
      m.tournament.status !== "ONGOING" ||
      !["SCHEDULED", "LIVE"].includes(m.status) ||
      !m.homeId ||
      !m.awayId
    )
      throw new AppError(409, "This match is not accepting a result.");
    try {
      winner(
        m.homeId,
        m.awayId,
        score.homeScore,
        score.awayScore,
        ["KNOCKOUT", "FINAL", "THIRD_PLACE"].includes(m.stage),
        score.homePenalties,
        score.awayPenalties,
      );
    } catch (e) {
      throw new AppError(
        422,
        e instanceof Error ? e.message : "Invalid score.",
      );
    }
    if (!score.evidenceId)
      throw new AppError(422, "A full-time screenshot is required.");
    const evidence = await tx.upload.findUnique({
      where: { id: score.evidenceId },
    });
    if (
      !evidence ||
      evidence.ownerId !== userId ||
      evidence.purpose !== "MATCH_EVIDENCE"
    )
      throw new AppError(403, "Use your own match screenshot.");
    const submission = await tx.matchResultSubmission.create({
      data: { ...score, matchId: id, submittedById: userId },
    });
    await tx.match.update({
      where: { id },
      data: { status: "RESULT_SUBMITTED", version: { increment: 1 } },
    });
    const opponent = userId === m.home!.userId ? m.away?.userId : m.home!.userId;
    if (opponent)
      await tx.notification.create({
        data: {
          userId: opponent,
          title: "Opponent submitted a result",
          message: m.tournament.name,
          type: "RESULT",
          link: "/matches/" + id,
        },
      });
    return submission;
  });
}
async function official(
  tx: Prisma.TransactionClient,
  id: string,
  score: ScoreInput,
) {
  const m = await tx.match.findUniqueOrThrow({
    where: { id },
    include: relations,
  });
  if (!m.homeId || !m.awayId)
    throw new AppError(409, "Both players must be assigned.");
  let winnerId: string | null;
  try {
    winnerId = winner(
      m.homeId,
      m.awayId,
      score.homeScore,
      score.awayScore,
      ["KNOCKOUT", "FINAL", "THIRD_PLACE"].includes(m.stage),
      score.homePenalties,
      score.awayPenalties,
    );
  } catch (e) {
    throw new AppError(422, e instanceof Error ? e.message : "Invalid winner.");
  }
  const { evidenceId: _evidence, ...scores } = score;
  await tx.match.update({
    where: { id },
    data: {
      ...scores,
      winnerId,
      status: "COMPLETED",
      completedAt: new Date(),
      version: { increment: 1 },
    },
  });
  if (m.nextMatchId && winnerId) {
    const next = await tx.match.findUniqueOrThrow({
      where: { id: m.nextMatchId },
    });
    if (next.status !== "SCHEDULED")
      throw new AppError(409, "The next match is already in progress.");
    await tx.match.update({
      where: { id: next.id },
      data: m.nextSlot === 0 ? { homeId: winnerId } : { awayId: winnerId },
    });
  }
  if (m.loserMatchId && winnerId) {
    const loserId = winnerId === m.homeId ? m.awayId : m.homeId;
    await tx.match.update({
      where: { id: m.loserMatchId },
      data: m.loserSlot === 0 ? { homeId: loserId } : { awayId: loserId },
    });
  }
  if (["GROUP", "LEAGUE"].includes(m.stage)) {
    const participants = await tx.tournamentParticipant.findMany({
        where: {
          tournamentId: m.tournamentId,
          ...(m.groupId
            ? { memberships: { some: { groupId: m.groupId } } }
            : {}),
        },
      }),
      matches = await tx.match.findMany({
        where: {
          tournamentId: m.tournamentId,
          stage: m.stage,
          groupId: m.groupId,
          status: { in: ["COMPLETED", "WALKOVER"] },
        },
      });
    const rows = calculateStandings(
      participants.map((p) => p.id),
      matches
        .filter(
          (x) =>
            x.homeId &&
            x.awayId &&
            x.homeScore !== null &&
            x.awayScore !== null,
        )
        .map((x) => ({
          homeId: x.homeId!,
          awayId: x.awayId!,
          homeScore: x.homeScore!,
          awayScore: x.awayScore!,
        })),
      {
        win: m.tournament.pointsWin,
        draw: m.tournament.pointsDraw,
        loss: m.tournament.pointsLoss,
      },
      m.tournament.goalDifferenceTiebreak,
      m.tournament.headToHeadTiebreak,
    );
    for (const row of rows) {
      const { participantId, ...data } = row;
      await tx.standing.upsert({
        where: {
          tournamentId_participantId_scope: {
            tournamentId: m.tournamentId,
            participantId,
            scope: m.groupId || "overall",
          },
        },
        create: {
          ...data,
          participantId,
          tournamentId: m.tournamentId,
          groupId: m.groupId,
          scope: m.groupId || "overall",
        },
        update: data,
      });
    }
  }
  if (m.stage === "FINAL" && winnerId)
    await tx.tournamentWinner.upsert({
      where: { tournamentId_place: { tournamentId: m.tournamentId, place: 1 } },
      create: {
        tournamentId: m.tournamentId,
        participantId: winnerId,
        place: 1,
      },
      update: { participantId: winnerId },
    });
  if (m.stage === "THIRD_PLACE" && winnerId)
    await tx.tournamentWinner.upsert({
      where: { tournamentId_place: { tournamentId: m.tournamentId, place: 3 } },
      create: {
        tournamentId: m.tournamentId,
        participantId: winnerId,
        place: 3,
      },
      update: { participantId: winnerId },
    });
  const outstanding = await tx.match.count({
    where: {
      tournamentId: m.tournamentId,
      status: { notIn: ["COMPLETED", "WALKOVER", "CANCELLED"] },
    },
  });
  if (!outstanding) await finishCompetition(tx,m.tournament,m.stage);
  await tx.notification.createMany({
    data: [m.home!.userId, m.away!.userId].map((userId) => ({
      userId,
      title: "Official result confirmed",
      message: `${score.homeScore} – ${score.awayScore} · ${m.tournament.name}`,
      type: "RESULT",
      link: "/matches/" + id,
    })),
  });
  return { id, status: "COMPLETED", winnerId };
}
export async function confirm(userId: string, id: string) {
  return transaction(async (tx) => {
    const m = await tx.match.findUnique({
      where: { id },
      include: {
        ...relations,
        submissions: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const s = m?.submissions[0];
    if (
      !m ||
      ![m.home?.userId, m.away?.userId].includes(userId) ||
      s?.submittedById === userId
    )
      throw new AppError(
        403,
        "Only the opposing player can confirm this result.",
      );
    if (m.status !== "RESULT_SUBMITTED" || !s)
      throw new AppError(409, "No pending result to confirm.");
    await tx.matchResultSubmission.update({
      where: { id: s.id },
      data: {
        status: "CONFIRMED",
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });
    return official(tx, id, {
      homeScore: s.homeScore,
      awayScore: s.awayScore,
      homePenalties: s.homePenalties,
      awayPenalties: s.awayPenalties,
    });
  });
}
export async function dispute(
  userId: string,
  id: string,
  reason: string,
  evidenceId: string,
) {
  return transaction(async (tx) => {
    const m = await tx.match.findUnique({
        where: { id },
        include: {
          ...relations,
          submissions: { where: { status: "PENDING" }, take: 1 },
        },
      }),
      s = m?.submissions[0];
    if (
      !m ||
      ![m.home?.userId, m.away?.userId].includes(userId) ||
      s?.submittedById === userId
    )
      throw new AppError(
        403,
        "Only the opposing player can dispute this result.",
      );
    if (m.status !== "RESULT_SUBMITTED" || !s)
      throw new AppError(409, "No pending result to dispute.");
    const evidence = await tx.upload.findUnique({ where: { id: evidenceId } });
    if (
      !evidence ||
      evidence.ownerId !== userId ||
      evidence.purpose !== "MATCH_EVIDENCE"
    )
      throw new AppError(403, "Upload your own counter-evidence.");
    await tx.matchResultSubmission.update({
      where: { id: s.id },
      data: {
        status: "DISPUTED",
        disputeReason: reason,
        disputeEvidenceId: evidenceId,
      },
    });
    await tx.match.update({
      where: { id },
      data: { status: "DISPUTED", version: { increment: 1 } },
    });
    await tx.notification.create({
      data: {
        userId: s.submittedById,
        title: "Your result has been disputed",
        message: reason,
        type: "DISPUTE",
        link: "/matches/" + id,
      },
    });
    return { id, status: "DISPUTED" };
  });
}
export async function resolve(
  actorId: string,
  id: string,
  score: ScoreInput,
  reason: string,
) {
  return transaction(async (tx) => {
    const m = await tx.match.findUnique({ where: { id } });
    if (!m || ["COMPLETED", "CANCELLED", "WALKOVER"].includes(m.status))
      throw new AppError(
        409,
        "This match cannot be changed through result review.",
      );
    const submission = await tx.matchResultSubmission.findFirst({
      where: { matchId: id, status: { in: ["PENDING", "DISPUTED"] } },
      orderBy: { createdAt: "desc" },
    });
    if (submission)
      await tx.matchResultSubmission.update({
        where: { id: submission.id },
        data: {
          status: "RESOLVED",
          reviewedById: actorId,
          reviewedAt: new Date(),
          decisionReason: reason,
        },
      });
    await tx.match.update({ where: { id }, data: { adminNotes: reason } });
    const result = await official(tx, id, score);
    await audit(tx, actorId, "RESULT_RESOLVED", m.tournamentId, {
      matchId: id,
      reason,
      score: { home: score.homeScore, away: score.awayScore },
    });
    return result;
  });
}
export async function view(id: string, userId?: string, admin = false) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: { ...relations, submissions: { orderBy: { createdAt: "desc" } } },
  });
  if (
    !match ||
    (!admin &&
      (match.tournament.visibility !== "PUBLIC" ||
        !match.tournament.publishedAt))
  )
    throw new AppError(404, "Match not found.");
  if (admin || [match.home?.userId, match.away?.userId].includes(userId))
    return match;
  return { ...match, adminNotes: null, submissions: [] };
}


export async function lookup(code:string,userId?:string,admin=false){
 const normalized=code.trim().toUpperCase().replace(/^TL-?/,'');
 if(!/^\d{1,10}$/.test(normalized))throw new AppError(422,'Enter a Match ID such as TL-000123.');
 const matchNumber=Number(normalized);if(matchNumber<1||matchNumber>2147483647)throw new AppError(404,'Match not found.');
 const match=await prisma.match.findUnique({where:{matchNumber},select:{id:true}});
 if(!match)throw new AppError(404,'Match not found. Check the ID and try again.');
 await view(match.id,userId,admin);
 return {id:match.id,matchNumber};
}
