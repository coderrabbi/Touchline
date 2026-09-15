"use client";
import Link from "next/link";
import { matchCode } from "@/lib/competition";
import { MatchSchedule } from "./match-schedule";
import { MatchCoordination } from "./match-coordination";
import { PlayerAvatar } from "@/components/player-avatar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  scoreSchema,
  type ScoreInput,
  type SessionUser,
} from "@touchline/shared";
import { api, uploadImage, openProtectedUpload } from "@/lib/api";
import type { MatchRecord } from "@/lib/competition";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { QueryState } from "@/components/query-state";
import { human } from "@/lib/catalog";

export function MatchRoom({ id }: { id: string }) {
  const {
    data: m,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ["match", id],
    queryFn: () => api<MatchRecord>("/matches/" + id),
  });
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => api<{ user: SessionUser }>("/auth/me", { anonymous: true }),
    retry: false,
  });
  const [evidence, setEvidence] = useState(""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScoreInput>({
    resolver: zodResolver(scoreSchema),
    defaultValues: { homeScore: 0, awayScore: 0 },
  });
  const user = session?.user,
    participant =
      !!user && [m?.home?.userId, m?.away?.userId].includes(user.id),
    pending = m?.submissions?.find((s) =>
      ["PENDING", "DISPUTED"].includes(s.status),
    ),
    opponent = participant && pending?.submittedById !== user?.id;
  async function act(path: string, body?: unknown, method = "POST") {
    setBusy(true);
    setFailure("");
    try {
      await api(path, { method, body });
      setMessage("Match updated successfully.");
      await refetch();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <QueryState
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      />
      {m && (
        <>
          <div className="eyebrow">
            {human(m.stage)} · ROUND {m.round}
          </div>
          <h1 style={{ marginTop: 14 }}>
            {m.tournament?.name || "Match room"}
          </h1>
          <div className="panel">
            <div className="actions">
              <span className="badge">
                Match ID: {matchCode(m.matchNumber)}
              </span>
              <Link href="/matches" className="lime small">
                Find another match →
              </Link>
            </div>
            <div className="scoreboard">
              <div className="scoreboard-player">
                {m.home && (
                  <PlayerAvatar
                    key={m.home.user.profile?.avatarUrl || m.home.user.id}
                    name={m.home.user.name}
                    url={m.home.user.profile?.avatarUrl}
                  />
                )}
                <div>
                  <h2>{m.home?.user.name || "To be decided"}</h2>
                  <p className="small muted">
                    {m.home?.user.profile?.efootballUsername}
                  </p>
                </div>
              </div>
              <strong className="display" style={{ fontSize: 48 }}>
                {m.homeScore !== null
                  ? `${m.homeScore} : ${m.awayScore}`
                  : pending
                    ? `${pending.homeScore} : ${pending.awayScore}`
                    : "VS"}
              </strong>
              <div className="scoreboard-player">
                {m.away && (
                  <PlayerAvatar
                    key={m.away.user.profile?.avatarUrl || m.away.user.id}
                    name={m.away.user.name}
                    url={m.away.user.profile?.avatarUrl}
                  />
                )}
                <div>
                  <h2>{m.away?.user.name || "To be decided"}</h2>
                  <p className="small muted">
                    {m.away?.user.profile?.efootballUsername}
                  </p>
                </div>
              </div>
            </div>
            <div className="row">
              <span className="badge">{human(m.status)}</span>
              <span className="small muted">
                {m.scheduledAt
                  ? new Date(m.scheduledAt).toLocaleString()
                  : "Schedule pending"}
              </span>
            </div>
            <p className="small muted" style={{ marginTop: 20 }}>
              Play this match inside eFootball. Upload a full-time screenshot
              here. Scores only become official after opponent confirmation or
              an administrator decision.
            </p>
            {pending?.evidenceId && (
              <a
                className="lime small"
                href={`/api/v1/uploads/${pending.evidenceId}`}
                target="_blank"
                rel="noreferrer"
              >
                View submitted evidence ↗
              </a>
            )}
            <Feedback message={message} />
            <Feedback message={failure} error />
          </div>
          {user && user.role !== "PLAYER" && m.status === "SCHEDULED" && (
            <MatchSchedule id={m.id} />
          )}{" "}
          {(participant || (user && user.role !== "PLAYER")) && (
            <MatchCoordination
              match={m}
              admin={!!user && user.role !== "PLAYER"}
            />
          )}{" "}
          {(participant || (user && user.role !== "PLAYER")) &&
            m.status !== "COMPLETED" && (
              <div className="panel">
                <h2>
                  {m.status === "DISPUTED"
                    ? "Dispute review"
                    : pending
                      ? "Review submitted result"
                      : "Submit the final score"}
                </h2>
                <form
                  onSubmit={handleSubmit(
                    (data) =>
                      void act(
                        user?.role !== "PLAYER"
                          ? "/admin/matches/" + id + "/result"
                          : "/matches/" + id + "/result",
                        user?.role !== "PLAYER"
                          ? {
                              score: {
                                ...data,
                                evidenceId: evidence || undefined,
                              },
                              reason,
                            }
                          : { ...data, evidenceId: evidence },
                        user?.role !== "PLAYER" ? "PATCH" : "POST",
                      ),
                  )}
                >
                  <div className="field-grid" style={{ marginTop: 20 }}>
                    {["homeScore", "awayScore"].map((key, i) => (
                      <div className="field" key={key}>
                        <label htmlFor={key}>
                          {i ? m.away?.user.name : m.home?.user.name}
                        </label>
                        <input
                          className="input"
                          type="number"
                          id={key}
                          min="0"
                          max="99"
                          {...register(key as "homeScore" | "awayScore", {
                            valueAsNumber: true,
                          })}
                        />
                        <p className="field-error">
                          {errors[key as "homeScore" | "awayScore"]?.message}
                        </p>
                      </div>
                    ))}
                  </div>
                  {["KNOCKOUT", "FINAL", "THIRD_PLACE"].includes(m.stage) && (
                    <div className="field-grid" style={{ marginTop: 15 }}>
                      {["homePenalties", "awayPenalties"].map((key, i) => (
                        <div className="field" key={key}>
                          <label htmlFor={key}>
                            {i ? "Away" : "Home"} penalties, if tied
                          </label>
                          <input
                            className="input"
                            type="number"
                            id={key}
                            {...register(
                              key as "homePenalties" | "awayPenalties",
                              {
                                setValueAs: (v) =>
                                  v === "" ? null : Number(v),
                              },
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <label
                    className="field"
                    style={{ display: "block", marginTop: 20 }}
                  >
                    Screenshot · PNG/JPG/WebP, up to 5 MB
                    <input
                      className="input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBusy(true);
                        try {
                          const result = await uploadImage(
                            file,
                            "MATCH_EVIDENCE",
                          );
                          setEvidence(result.id);
                          setMessage("Evidence uploaded.");
                        } catch (err) {
                          setFailure(
                            err instanceof Error
                              ? err.message
                              : "Upload failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  </label>
                  {(opponent || user?.role !== "PLAYER") && (
                    <div className="field" style={{ marginTop: 15 }}>
                      <label htmlFor="reason">Reason / decision</label>
                      <textarea
                        className="input"
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        minLength={10}
                      />
                    </div>
                  )}
                  <div className="actions">
                    {!pending && participant && (
                      <Button type="submit" disabled={busy || !evidence}>
                        Submit for confirmation
                      </Button>
                    )}
                    {opponent && m.status === "RESULT_SUBMITTED" && (
                      <>
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void act("/matches/" + id + "/confirm")
                          }
                        >
                          Confirm result
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy || !evidence || reason.length < 10}
                          onClick={() =>
                            void act("/matches/" + id + "/dispute", {
                              reason,
                              evidenceId: evidence,
                            })
                          }
                        >
                          Dispute with evidence
                        </Button>
                      </>
                    )}
                    {user && user.role !== "PLAYER" && (
                      <Button
                        type="submit"
                        disabled={busy || reason.length < 10}
                      >
                        Publish official decision
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}
        </>
      )}
    </>
  );
}
