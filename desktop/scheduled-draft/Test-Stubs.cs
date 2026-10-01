// Test-only WinRT doubles. NEVER include this file in a native release project.
using System;
using System.Collections.Generic;
using System.Linq;
namespace Windows.Data.Xml.Dom
{
    public sealed class XmlDocument
    {
        private string text;
        public void LoadXml(string value) { text = value; }
        public string GetXml() { return text; }
    }
}
namespace Windows.UI.Notifications
{
    public enum NotificationSetting { Enabled, DisabledForApplication }
    public enum NotificationMirroring { Allowed, Disabled }
    public sealed class ScheduledToastNotification
    {
        public ScheduledToastNotification(Windows.Data.Xml.Dom.XmlDocument xml, DateTimeOffset due) { Content = xml; DeliveryTime = due; }
        public Windows.Data.Xml.Dom.XmlDocument Content { get; }
        public DateTimeOffset DeliveryTime { get; }
        public string Tag { get; set; }
        public string Group { get; set; }
        public DateTimeOffset? ExpirationTime { get; set; }
        public NotificationMirroring NotificationMirroring { get; set; }
    }
    public sealed class ToastNotifier
    {
        private readonly List<ScheduledToastNotification> items = new List<ScheduledToastNotification>();
        public NotificationSetting Setting { get; set; } = NotificationSetting.Enabled;
        public int Adds { get; private set; }
        public int Removes { get; private set; }
        public bool FailAdd { get; set; }
        public IReadOnlyList<ScheduledToastNotification> GetScheduledToastNotifications() { return items.ToArray(); }
        public void AddToSchedule(ScheduledToastNotification item) { if (FailAdd) throw new InvalidOperationException(); items.Add(item); Adds++; }
        public void RemoveFromSchedule(ScheduledToastNotification item) { items.Remove(item); Removes++; }
    }
}
namespace Oharu.ScheduledDraft
{
    public static class DraftTests
    {
        private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
        private static DueTask Task(string id, DateTimeOffset due) { return new DueTask { Id = id, DueAt = due.ToString("O") }; }
        public static string Run()
        {
            var now = DateTimeOffset.UtcNow;
            var a = Task("a", now.AddHours(2));
            var notifier = new Windows.UI.Notifications.ToastNotifier();
            var scheduler = new WindowsScheduler(notifier);
            Check(scheduler.Reconcile(new[] {a}, true).Success && notifier.Adds == 1, "initial scheduling");
            Check(scheduler.Reconcile(new[] {a}, true).Success && notifier.Adds == 1, "idempotent no duplicate");
            Check(!scheduler.Reconcile(new DueTask[0], false).Success && notifier.Removes == 0, "offline unknown preserves");
            Check(!scheduler.Reconcile(new[] {a, a}, true).Success && notifier.Removes == 0, "duplicate prevalidation");
            Check(!scheduler.Reconcile(new[] {a, new DueTask {Id="bad", DueAt="2026-09-30T12:00:00"}}, true).Success && notifier.Removes == 0, "timezone missing preserves");
            a.DueAt = now.AddHours(3).ToString("O");
            Check(scheduler.Reconcile(new[] {a}, true).Success && notifier.Adds == 2 && notifier.Removes == 1, "edit replaces");
            a.Done = true;
            Check(scheduler.Reconcile(new[] {a}, true).Success && notifier.GetScheduledToastNotifications().Count == 0, "complete cancels");
            a.Done = false;
            scheduler.Reconcile(new[] {a}, true);
            notifier.Setting = Windows.UI.Notifications.NotificationSetting.DisabledForApplication;
            Check(scheduler.Reconcile(new DueTask[0], true).Success && notifier.GetScheduledToastNotifications().Count == 0, "logout cancel even denied");
            Check(scheduler.Reconcile(new[] {a}, true).Error == "os-notifications-disabled", "permission failure visible");
            notifier.Setting = Windows.UI.Notifications.NotificationSetting.Enabled;
            notifier.FailAdd = true;
            Check(!scheduler.Reconcile(new[] {a}, true).Success, "native error visible");
            notifier.FailAdd = false;
            Check(scheduler.Reconcile(new[] {a}, true).Success, "retry recovers");
            var xml = new Windows.Data.Xml.Dom.XmlDocument(); xml.LoadXml("foreign");
            notifier.AddToSchedule(new Windows.UI.Notifications.ScheduledToastNotification(xml, now.AddHours(1)) {Tag="other", Group="foreign"});
            Check(scheduler.Reconcile(new DueTask[0], true).Success && notifier.GetScheduledToastNotifications().Single().Group == "foreign", "never cancels other group");
            Check(SchedulePlan.Build(new[] {Task("old", now.AddMinutes(-1))}, true, now).Length == 0, "no overdue replay");
            var local = Task("zone", now.AddHours(4).ToOffset(TimeSpan.FromHours(9)));
            var utc = Task("zone", now.AddHours(4).ToUniversalTime());
            Check(SchedulePlan.Build(new[] {local}, true, now)[0].Due == SchedulePlan.Build(new[] {utc}, true, now)[0].Due, "offset equivalence");
            Check(!SchedulePlan.Payload.Contains("{title}") && !SchedulePlan.Payload.Contains("http"), "generic private content");
            return "PASS 15 C# scenarios (actual planner/adapter; mocked WinRT, no OS notifications)";
        }
    }
}
