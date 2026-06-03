use crate::models::{Settings, Task};
use chrono::{DateTime, NaiveTime, Utc};

/// Slack Time in minutes: `(due_by - now) - effort_minutes`.
/// `None` when `due_by` is null — caller sorts these to the bottom.
pub fn compute_slack_minutes(
    due_by: Option<DateTime<Utc>>,
    effort_minutes: i64,
    now: DateTime<Utc>,
) -> Option<i64> {
    let due = due_by?;
    let until_due = due.signed_duration_since(now).num_minutes();
    Some(until_due - effort_minutes)
}

/// True if the sum of effort for "urgent" tasks (ST <= 24h) exceeds the user's remaining
/// workday hours.
pub fn capacity_warning(tasks: &[Task], settings: &Settings, now: DateTime<Utc>) -> bool {
    let urgent_minutes: i64 = tasks
        .iter()
        .filter(|t| t.completed_at.is_none())
        .filter_map(|t| {
            let st = compute_slack_minutes(t.due_by, t.effort_minutes, now)?;
            (st <= 24 * 60).then_some(t.effort_minutes)
        })
        .sum();
    let urgent_hours = urgent_minutes as f64 / 60.0;
    let remaining = remaining_workday_hours(settings, now).unwrap_or(settings.daily_capacity_hrs);
    urgent_hours > remaining
}

fn remaining_workday_hours(settings: &Settings, now: DateTime<Utc>) -> Option<f64> {
    let end = NaiveTime::parse_from_str(&settings.workday_end, "%H:%M").ok()?;
    let today_end = now.date_naive().and_time(end).and_utc();
    let mins = today_end.signed_duration_since(now).num_minutes();
    if mins <= 0 {
        return Some(0.0);
    }
    Some((mins as f64 / 60.0).min(settings.daily_capacity_hrs))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn at(y: i32, m: u32, d: u32, h: u32, mn: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, h, mn, 0).unwrap()
    }

    fn mk_task(due: Option<DateTime<Utc>>, effort: i64) -> Task {
        Task {
            id: "t".into(),
            title: "x".into(),
            effort_minutes: effort,
            context_id: "c".into(),
            available_from: None,
            due_by: due,
            completed_at: None,
            created_at: at(2026, 1, 1, 0, 0),
            updated_at: at(2026, 1, 1, 0, 0),
        }
    }

    fn mk_settings() -> Settings {
        Settings {
            id: 1,
            daily_capacity_hrs: 8.0,
            workday_start: "09:00".into(),
            workday_end: "17:00".into(),
            current_context_id: None,
        }
    }

    #[test]
    fn positive_slack() {
        let now = at(2026, 6, 2, 10, 0);
        let due = at(2026, 6, 2, 18, 0); // 8 hours
        assert_eq!(compute_slack_minutes(Some(due), 60, now), Some(420));
    }

    #[test]
    fn zero_slack() {
        let now = at(2026, 6, 2, 10, 0);
        let due = at(2026, 6, 2, 11, 0); // 60 min
        assert_eq!(compute_slack_minutes(Some(due), 60, now), Some(0));
    }

    #[test]
    fn negative_slack() {
        let now = at(2026, 6, 2, 10, 0);
        let due = at(2026, 6, 2, 10, 30);
        assert_eq!(compute_slack_minutes(Some(due), 60, now), Some(-30));
    }

    #[test]
    fn null_due_by_returns_none() {
        let now = at(2026, 6, 2, 10, 0);
        assert_eq!(compute_slack_minutes(None, 60, now), None);
    }

    #[test]
    fn capacity_warning_triggers_when_overloaded() {
        let now = at(2026, 6, 2, 9, 0); // 8 workday hours left
        let due = at(2026, 6, 2, 11, 0); // ST=120-effort
        let tasks = vec![
            mk_task(Some(due), 120),
            mk_task(Some(due), 240),
            mk_task(Some(due), 360),
        ]; // 720 min = 12h urgent vs 8h available
        assert!(capacity_warning(&tasks, &mk_settings(), now));
    }

    #[test]
    fn capacity_warning_quiet_when_ok() {
        let now = at(2026, 6, 2, 9, 0);
        let due = at(2026, 6, 2, 12, 0);
        let tasks = vec![mk_task(Some(due), 60)];
        assert!(!capacity_warning(&tasks, &mk_settings(), now));
    }
}
