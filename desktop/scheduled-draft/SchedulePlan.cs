using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Oharu.ScheduledDraft
{
    public sealed class DueTask
    {
        public string Id { get; set; }
        public string DueAt { get; set; }
        public bool Done { get; set; }
    }
    public sealed class Reservation
    {
        public string Tag { get; set; }
        public DateTimeOffset Due { get; set; }
    }
    public static class SchedulePlan
    {
        public const string Group = "oharu-sched-v1";
        // Generic content deliberately contains no task text, account, or access token.
        public const string Payload = "<toast launch=\"action=openOharu\"><visual><binding template=\"ToastGeneric\"><text>Oharu</text><text>예정된 할 일이 있어요. 앱에서 확인하세요.</text></binding></visual></toast>";
        public static Reservation[] Build(DueTask[] tasks, bool authoritative, DateTimeOffset now)
        {
            if (!authoritative) throw new InvalidOperationException("snapshot-not-ready");
            if (tasks == null || tasks.Length > 500) throw new ArgumentException("invalid-snapshot");
            var ids = new HashSet<string>(StringComparer.Ordinal);
            var tags = new HashSet<string>(StringComparer.Ordinal);
            var result = new List<Reservation>();
            foreach (var task in tasks)
            {
                if (task == null || String.IsNullOrWhiteSpace(task.Id) || task.Id.Length > 200 || !ids.Add(task.Id))
                    throw new ArgumentException("invalid-or-duplicate-id");
                DateTimeOffset due;
                if (task.DueAt == null || !Regex.IsMatch(task.DueAt, @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?(Z|[+-]\d{2}:\d{2})$") ||
                    !DateTimeOffset.TryParse(task.DueAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out due))
                    throw new ArgumentException("invalid-explicit-offset-date");
                // Past tasks are returned by the app's overdue UI, never replayed as new toast.
                if (task.Done || due <= now) continue;
                string tag;
                using (var sha = SHA256.Create())
                    tag = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(task.Id))).Replace("-", "").Substring(0, 16);
                if (!tags.Add(tag)) throw new ArgumentException("tag-collision");
                result.Add(new Reservation { Tag = tag, Due = due.ToUniversalTime() });
            }
            return result.OrderBy(r => r.Due).ThenBy(r => r.Tag, StringComparer.Ordinal).ToArray();
        }
    }
}
