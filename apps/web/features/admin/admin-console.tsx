"use client";
import { NoShowQueue } from "./no-show-queue";
import Link from "next/link";
import { DeleteTournament } from "./delete-tournament";
import { DeleteAccount } from "./delete-account";
import { RoleControl } from "./role-control";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Tournament } from "@/lib/catalog";
import { human } from "@/lib/catalog";
import type { MatchRecord, PlayerRef } from "@/lib/competition";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { QueryState } from "@/components/query-state";
import { MatchList } from "@/features/tournaments/competition-view";
interface AdminData {
  users: Array<PlayerRef & { email: string; role: string; status: string }>;
  tournaments: Tournament[];
  matches: MatchRecord[];
  registrations: Array<{
    id: string;
    user: PlayerRef;
    tournament: { name: string };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string } | null;
    metadata: unknown;
  }>;
  announcements: Array<{ id: string; title: string; message: string }>;
  statistics: Record<string, number>;
}
export function AdminConsole({ section = "dashboard" }: { section?: string }) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["admin"],
    queryFn: () => api<AdminData>("/admin/dashboard"),
  });
  const [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(path: string, body?: unknown, method = "POST") {
    setBusy(true);
    setFailure("");
    try {
      await api(path, { method, body });
      setMessage("Action saved.");
      await refetch();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  function reason() {
    return (
      prompt("Reason for the audit history (at least 10 characters):") || ""
    );
  }
  return (
    <>
      <div className="row">
        <div>
          <div className="eyebrow">ADMINISTRATOR WORKSPACE</div>
          <h1 style={{ marginTop: 12 }}>{human(section)}</h1>
        </div>
        <Button asChild>
          <Link href="/admin/tournaments/create">+ Create tournament</Link>
        </Button>
      </div>
      <nav className="tabs" aria-label="Admin sections">
        {[
          "dashboard",
          "tournaments",
          "players",
          "registrations",
          "matches",
          "disputes",
          "announcements",
          "statistics",
          "audit",
        ].map((x) => (
          <Link
            key={x}
            className={section === x ? "active" : ""}
            href={x === "dashboard" ? "/admin" : "/admin/" + x}
          >
            {human(x)}
          </Link>
        ))}
      </nav>
      <Feedback message={message} />
      <Feedback message={failure} error />
      <QueryState
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      />
      {data && (
        <>
          {section === "dashboard" || section === "statistics" ? (
            <>
              <div className="stats">
                {Object.entries(data.statistics).map(([key, n]) => (
                  <div className="stat" key={key}>
                    <strong>{n}</strong>
                    <span>{key.replace(/([A-Z])/g, " $1")}</span>
                  </div>
                ))}
              </div>
              <div className="panel">
                <h2>Tournament participation</h2>
                <div style={{ height: 300, marginTop: 20 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.tournaments.map((t) => ({
                        name: t.name,
                        players: t._count?.participants || 0,
                      }))}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#a0a8b4", fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: "#a0a8b4" }} />
                      <Tooltip
                        contentStyle={{
                          background: "#15191f",
                          borderColor: "#38404b",
                        }}
                      />
                      <Bar
                        dataKey="players"
                        fill="#b8f763"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : section === "tournaments" ? (
            <div className="card">
              {data.tournaments.map((t) => (
                <div className="match-row" key={t.id}>
                  <div className="grow">
                    <h3>{t.name}</h3>
                    <span className="badge">{human(t.status)}</span>
                    <p className="small muted">
                      {t._count?.participants || 0} participants ·{" "}
                      {human(t.format)}
                    </p>
                  </div>
                  <div className="actions">
                    <Button asChild variant="outline">
                      <Link href={"/admin/tournaments/" + t.id}>Manage</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void act("/admin/tournaments/" + t.id + "/duplicate")
                      }
                    >
                      Duplicate
                    </Button>
                    {t.status === "DRAFT" && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act("/tournaments/" + t.id + "/status", {
                            status: "REGISTRATION_OPEN",
                            reason:
                              "Administrator reviewed and published the tournament.",
                          })
                        }
                      >
                        Publish
                      </Button>
                    )}
                    {t.status === "REGISTRATION_OPEN" && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void act("/tournaments/" + t.id + "/status", {
                            status: "REGISTRATION_CLOSED",
                            reason: "Administrator closed registrations.",
                          })
                        }
                      >
                        Close registration
                      </Button>
                    )}
                    {["REGISTRATION_CLOSED", "UPCOMING"].includes(t.status) && (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              "Generate and publish fixtures? Existing fixtures cannot be overwritten.",
                            )
                          )
                            void act(
                              "/admin/tournaments/" +
                                t.id +
                                "/generate-fixtures",
                            );
                        }}
                      >
                        Generate fixtures
                      </Button>
                    )}
                    {[
                      "REGISTRATION_OPEN",
                      "REGISTRATION_CLOSED",
                      "UPCOMING",
                    ].includes(t.status) && (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              "Kick off now? This closes registration, generates missing fixtures and starts the opening round.",
                            )
                          )
                            void act("/tournaments/" + t.id + "/kickoff");
                        }}
                      >
                        Kick off now →
                      </Button>
                    )}
                    {t.format === "GROUP_KNOCKOUT" &&
                      t.status === "ONGOING" && (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void act("/admin/tournaments/" + t.id + "/qualify")
                          }
                        >
                          Confirm qualification
                        </Button>
                      )}
                    <Button asChild variant="outline">
                      <Link href={"/tournaments/" + t.slug}>View ↗</Link>
                    </Button>
                    <DeleteTournament t={t} onSaved={refetch} />
                    {!["CANCELLED", "COMPLETED"].includes(t.status) && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          const r = reason();
                          if (
                            r.length >= 10 &&
                            confirm(
                              "Cancel this tournament and its unfinished matches?",
                            )
                          )
                            void act("/tournaments/" + t.id + "/status", {
                              status: "CANCELLED",
                              reason: r,
                            });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : section === "registrations" ? (
            <div className="card">
              {data.registrations.length ? (
                data.registrations.map((r) => (
                  <div className="match-row" key={r.id}>
                    <div className="grow">
                      <h3>{r.user.name}</h3>
                      <p className="muted small">{r.tournament.name}</p>
                    </div>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "/admin/registrations/" + r.id,
                          {
                            approve: true,
                            reason: "Eligibility reviewed and approved.",
                          },
                          "PATCH",
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        const text = reason();
                        if (text.length >= 10)
                          void act(
                            "/admin/registrations/" + r.id,
                            { approve: false, reason: text },
                            "PATCH",
                          );
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                ))
              ) : (
                <div className="empty">No registrations need review.</div>
              )}
            </div>
          ) : section === 'players' ? (
  <div className="players-section">

    {/* Desktop / Tablet */}
    <div className="panel players-table-wrapper">
      <table className="players-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="player-info">
                  <strong>{u.name}</strong>

                  <p className="muted small">
                    {u.email}
                  </p>
                </div>
              </td>

              <td>
                <span className="player-role">
                  {human(u.role)}
                </span>
              </td>

              <td>
                <span
                  className={`player-status ${
                    u.status === 'ACTIVE'
                      ? 'active'
                      : 'suspended'
                  }`}
                >
                  {human(u.status)}
                </span>
              </td>

              <td>
                <div className="player-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      busy ||
                      u.role === 'SUPER_ADMIN'
                    }
                    onClick={() => {
                      const text = reason();

                      if (
                        text.length >= 10 &&
                        confirm(
                          'Apply account restriction change and revoke all sessions?',
                        )
                      ) {
                        void act(
                          '/admin/users/' + u.id,
                          {
                            status:
                              u.status === 'ACTIVE'
                                ? 'SUSPENDED'
                                : 'ACTIVE',
                            reason: text,
                          },
                          'PATCH',
                        );
                      }
                    }}
                  >
                    {u.status === 'ACTIVE'
                      ? 'Suspend'
                      : 'Restore'}
                  </Button>

                  <RoleControl
                    user={u}
                    onSaved={refetch}
                  />

                  <DeleteAccount
                    user={u}
                    onSaved={refetch}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>


    {/* Mobile */}
    <div className="players-mobile">
      {data.users.map((u) => (
        <div
          className="player-card"
          key={u.id}
        >
          <div className="player-card-top">
            <div className="player-card-user">
              <div className="player-avatar">
                {u.name
                  ?.split(' ')
                  .map((word) => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div>
                <h3>{u.name}</h3>

                <p className="muted small">
                  {u.email}
                </p>
              </div>
            </div>

            <span
              className={`player-status ${
                u.status === 'ACTIVE'
                  ? 'active'
                  : 'suspended'
              }`}
            >
              {human(u.status)}
            </span>
          </div>

          <div className="player-card-details">
            <div>
              <span className="detail-label">
                Role
              </span>

              <strong>
                {human(u.role)}
              </strong>
            </div>

            <div>
              <span className="detail-label">
                Status
              </span>

              <strong>
                {human(u.status)}
              </strong>
            </div>
          </div>

          <div className="player-card-actions">
            <Button
              variant="outline"
              size="sm"
              disabled={
                busy ||
                u.role === 'SUPER_ADMIN'
              }
              onClick={() => {
                const text = reason();

                if (
                  text.length >= 10 &&
                  confirm(
                    'Apply account restriction change and revoke all sessions?',
                  )
                ) {
                  void act(
                    '/admin/users/' + u.id,
                    {
                      status:
                        u.status === 'ACTIVE'
                          ? 'SUSPENDED'
                          : 'ACTIVE',

                      reason: text,
                    },
                    'PATCH',
                  );
                }
              }}
            >
              {u.status === 'ACTIVE'
                ? 'Suspend account'
                : 'Restore account'}
            </Button>

            <div className="mobile-role-control">
              <RoleControl
                user={u}
                onSaved={refetch}
              />
            </div>

            <div className="mobile-delete-control">
              <DeleteAccount
                user={u}
                onSaved={refetch}
              />
            </div>
          </div>
        </div>
      ))}
    </div>

  </div>
) : section === "matches" || section === "disputes" ? (
            <>
              <NoShowQueue />
              <MatchList
                matches={
                  section === "disputes"
                    ? data.matches.filter((m) => m.status === "DISPUTED")
                    : data.matches
                }
              />
            </>
          ) : section === "announcements" ? (
            <>
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void act("/admin/announcements", {
                    title: f.get("title"),
                    message: f.get("message"),
                    ...(f.get("tournamentId")
                      ? { tournamentId: f.get("tournamentId") }
                      : {}),
                  });
                }}
              >
                <h2>Publish announcement</h2>
                <div className="form-fields">
                  <label className="field">
                    Title
                    <input
                      className="input"
                      name="title"
                      required
                      minLength={3}
                    />
                  </label>
                  <label className="field">
                    Message
                    <textarea
                      className="input"
                      name="message"
                      required
                      minLength={10}
                    />
                  </label>
                  <label className="field">
                    Audience
                    <select name="tournamentId">
                      <option value="">Global</option>
                      {data.tournaments.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Button type="submit" disabled={busy}>
                  Publish announcement
                </Button>
              </form>
              {data.announcements.map((a) => (
                <div className="panel" key={a.id}>
                  <h3>{a.title}</h3>
                  <p>{a.message}</p>
                </div>
              ))}
            </>
          ) : (
            <div className="panel table-scroll">
              <h2>Audit history</h2>
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Time</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditLogs.map((a) => (
                    <tr key={a.id}>
                      <td>{human(a.action)}</td>
                      <td>{a.actor?.name || "System"}</td>
                      <td>{new Date(a.createdAt).toLocaleString()}</td>
                      <td className="small">{JSON.stringify(a.metadata)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
