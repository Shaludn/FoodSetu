
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const COLORS = {
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  orange: '#F97316',
  pink: '#EC4899',
  cyan: '#06B6D4',
  yellow: '#F59E0B',
  red: '#EF4444',
};

const PALETTE = Object.values(COLORS);

function formatNumber(value, digits = 1) {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function Card({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function ChartHeading({ title, subtitle, color = 'text-slate-900' }) {
  return (
    <div className="mb-5">
      <h3 className={`text-base font-extrabold ${color}`}>{title}</h3>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

function StatCard({ label, value, note, icon, color, background }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${background} p-5 text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="absolute -right-5 -top-7 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 right-12 h-24 w-24 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/85">{label}</p>
          <p className="mt-3 break-words text-3xl font-black tracking-tight">
            {value}
          </p>
          {note && <p className="mt-2 text-xs text-white/80">{note}</p>}
        </div>
        <div className={`rounded-xl bg-white/20 p-3 text-2xl ${color || ''}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
        {label}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-sm font-bold text-slate-800">
          {value}
        </span>
      )}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center">
      <span className="text-4xl">📊</span>
      <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
    </div>
  );
}

function MonthlyBarChart({ data }) {
  const [metric, setMetric] = useState('foodKg');

  const maxValue = Math.max(
    1,
    ...data.map((item) => Number(item[metric] || 0))
  );

  if (!data.length) {
    return <EmptyChart message="No monthly data available yet." />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMetric('foodKg')}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              metric === 'foodKg'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Food delivered (kg)
          </button>
          <button
            type="button"
            onClick={() => setMetric('deliveries')}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              metric === 'deliveries'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed deliveries
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Last {data.length} months
        </span>
      </div>

      <div className="flex h-64 gap-3">
        <div className="flex flex-col justify-between pb-8 text-right text-[10px] text-slate-400">
          {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
            <span key={fraction}>
              {formatNumber(maxValue * fraction, 0)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 bottom-8 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((line) => (
              <div
                key={line}
                className="border-t border-dashed border-slate-200"
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-end justify-around gap-2">
            {data.map((item, index) => {
              const value = Number(item[metric] || 0);
              const height = (value / maxValue) * 100;
              const color =
                metric === 'foodKg'
                  ? PALETTE[index % PALETTE.length]
                  : COLORS.blue;

              return (
                <div
                  key={`${item.month}-${index}`}
                  className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                >
                  <div className="relative flex h-[calc(100%-2rem)] items-end justify-center">
                    {value > 0 && (
                      <div
                        title={`${item.month}: ${formatNumber(value)} ${
                          metric === 'foodKg' ? 'kg' : 'deliveries'
                        }`}
                        className="w-[65%] min-w-2 rounded-t-lg transition-all duration-500 hover:brightness-110"
                        style={{
                          height: `${Math.max(height, 2)}%`,
                          background: `linear-gradient(to top, ${color}, ${color}99)`,
                          boxShadow: `0 4px 12px ${color}30`,
                        }}
                      />
                    )}
                    <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                      <strong>{item.month}</strong>
                      <br />
                      {formatNumber(value)}{' '}
                      {metric === 'foodKg' ? 'kg' : 'deliveries'}
                    </div>
                  </div>

                  <span className="mt-3 block truncate text-center text-[10px] font-semibold text-slate-500 sm:text-xs">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({ completed, active }) {
  const total = completed + active;

  const completedPercent = total ? (completed / total) * 100 : 0;
  const activePercent = total ? (active / total) * 100 : 0;

  if (!total) {
    return <EmptyChart message="Delivery statistics will appear here." />;
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:justify-around">
      <div
        className="relative h-48 w-48 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${COLORS.green} 0% ${completedPercent}%, ${COLORS.orange} ${completedPercent}% 100%)`,
        }}
      >
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-black text-slate-800">
            {formatNumber(total, 0)}
          </span>
          <span className="mt-1 text-xs font-semibold text-slate-500">
            Tracked deliveries
          </span>
        </div>
      </div>

      <div className="w-full space-y-4 sm:max-w-48">
        <LegendItem
          color={COLORS.green}
          label="Completed"
          value={formatNumber(completed, 0)}
        />
        <div className="ml-5 text-xs text-slate-400">
          {formatNumber(completedPercent, 1)}% of tracked deliveries
        </div>

        <LegendItem
          color={COLORS.orange}
          label="Active"
          value={formatNumber(active, 0)}
        />
        <div className="ml-5 text-xs text-slate-400">
          {formatNumber(activePercent, 1)}% of tracked deliveries
        </div>
      </div>
    </div>
  );
}

function ContributionPie({ items }) {
  const contributions = items
    .map((item) => ({
      name: item.name,
      value: Math.max(0, Number(item.foodKg || 0)),
    }))
    .filter((item) => item.value > 0);

  const total = contributions.reduce((sum, item) => sum + item.value, 0);

  const segments = useMemo(() => {
    let current = 0;

    return contributions.map((item, index) => {
      const start = current;
      const percent = (item.value / (total || 1)) * 100;
      current += percent;

      return {
        ...item,
        start,
        end: current,
        color: PALETTE[index % PALETTE.length],
        percent,
      };
    });
  }, [contributions.map((item) => `${item.name}:${item.value}`).join('|'), total]);

  if (!segments.length) {
    return <EmptyChart message="Donor contributions will appear once food is delivered." />;
  }

  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:items-center sm:justify-around">
      <div
        className="relative h-48 w-48 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-2xl font-black text-slate-800">
            {formatNumber(total)}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Total kg
          </span>
        </div>
      </div>

      <div className="w-full space-y-3 sm:max-w-56">
        {segments.map((segment) => (
          <LegendItem
            key={segment.name}
            color={segment.color}
            label={segment.name}
            value={`${formatNumber(segment.percent, 1)}%`}
          />
        ))}
      </div>
    </div>
  );
}

function RankingChart({ items, mode = 'donor' }) {
  const metric = mode === 'donor' ? 'foodKg' : 'deliveries';
  const max = Math.max(1, ...items.map((item) => Number(item[metric] || 0)));

  if (!items.length) {
    return <EmptyChart message="No completed contributions to rank yet." />;
  }

  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const value = Number(item[metric] || 0);
        const color = PALETTE[index % PALETTE.length];

        return (
          <div key={`${item.name}-${index}`}>
            <div className="mb-2 flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                style={{ backgroundColor: color }}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold text-slate-800">
                  {item.name}
                </p>
                <p className="text-xs text-slate-500">
                  {mode === 'donor'
                    ? `${formatNumber(item.deliveries, 0)} completed deliveries`
                    : `${formatNumber(item.foodKg)} kg received`}
                </p>
              </div>

              <span className="shrink-0 text-sm font-extrabold text-slate-800">
                {mode === 'donor'
                  ? `${formatNumber(value)} kg`
                  : formatNumber(value, 0)}
              </span>
            </div>

            <div className="ml-11 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(value > 0 ? 2 : 0, (value / max) * 100)}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}99)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminImpactReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/admin/impact');
      setReport(response.data);
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not load the detailed impact report.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report?.summary ?? {};
  const monthlyTrend = report?.monthlyTrend ?? [];
  const topDonors = report?.topDonors ?? [];
  const topNGOs = report?.topNGOs ?? [];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
        <div className="absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-teal-300/10" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-50">
              <span className="h-2 w-2 rounded-full bg-lime-300" />
              Live platform analytics
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Impact Report
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
              Explore food recovery, delivery performance and the partners
              making a difference in your community.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadReport(true)}
            disabled={refreshing || loading}
            className="rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
          >
            {refreshing ? '↻ Refreshing…' : '↻ Refresh analytics'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadReport()}
            className="mt-2 font-bold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading && !report ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          Loading your analytics…
        </div>
      ) : report ? (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Food delivered"
              value={`${formatNumber(summary.totalFoodKg)} kg`}
              note="From completed deliveries"
              icon="🌾"
              background="from-emerald-500 to-green-700"
            />
            <StatCard
              label="Completed deliveries"
              value={formatNumber(summary.completedDeliveries, 0)}
              note="Successfully delivered"
              icon="🚚"
              background="from-blue-500 to-indigo-600"
            />
            <StatCard
              label="Active deliveries"
              value={formatNumber(summary.activeDeliveries, 0)}
              note="Assigned or in progress"
              icon="⚡"
              background="from-orange-400 to-rose-500"
            />
            <StatCard
              label="Verified NGOs"
              value={`${formatNumber(summary.verifiedNGOs, 0)} / ${formatNumber(summary.totalNGOs, 0)}`}
              note="Verified / registered"
              icon="🤝"
              background="from-violet-500 to-purple-700"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Registered donors"
              value={formatNumber(summary.totalDonors, 0)}
              note="Food recovery partners"
              icon="💚"
              background="from-pink-500 to-rose-600"
            />
            <StatCard
              label="All food listings"
              value={formatNumber(summary.totalListings, 0)}
              note="Listed, matched and expired"
              icon="📦"
              background="from-cyan-500 to-blue-600"
            />
          </div>

          {/* Monthly bar chart */}
          <Card>
            <ChartHeading
              title="📈 Monthly performance"
              subtitle="Compare recovered food quantities and completed deliveries over the last six months."
            />
            <MonthlyBarChart data={monthlyTrend} />
          </Card>

          {/* Donut and pie charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <ChartHeading
                title="🍩 Delivery status breakdown"
                subtitle="Completed and active deliveries reported by the platform."
              />
              <DonutChart
                completed={Number(summary.completedDeliveries || 0)}
                active={Number(summary.activeDeliveries || 0)}
              />
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                This chart compares completed and active deliveries only. It
                does not include a separate expired or cancelled category.
              </p>
            </Card>

            <Card>
              <ChartHeading
                title="🥧 Donor contribution share"
                subtitle="Share of completed-delivery food quantity among the top donor organizations."
              />
              <ContributionPie items={topDonors} />
            </Card>
          </div>

          {/* Ranking charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <ChartHeading
                title="🏆 Top donor organizations"
                subtitle="Ranked by kilograms of food delivered successfully."
              />
              <RankingChart items={topDonors} mode="donor" />
            </Card>

            <Card>
              <ChartHeading
                title="🌟 Top NGO recipients"
                subtitle="Ranked by completed deliveries received."
              />
              <RankingChart items={topNGOs} mode="ngo" />
            </Card>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50 p-4">
            <div>
              <p className="text-sm font-bold text-slate-700">
                FoodBridge analytics overview
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Rankings use recorded completed-delivery quantities.
              </p>
            </div>

            <p className="text-xs font-medium text-slate-500">
              Last generated:{' '}
              {report.generatedAt
                ? new Date(report.generatedAt).toLocaleString()
                : 'Not available'}
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
