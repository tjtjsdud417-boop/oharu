// SOURCE-ONLY: requires Windows SDK WinRT references and an identity/activation host.
// No app registration, executable entry point, network, credentials or installer mutations.
using System;
using System.Collections.Generic;
using System.Linq;
using Windows.Data.Xml.Dom;
using Windows.UI.Notifications;

namespace Oharu.ScheduledDraft
{
    public sealed class SyncResult
    {
        public bool Success { get; set; }
        public int Pending { get; set; }
        public string Error { get; set; }
    }
    public sealed class WindowsScheduler
    {
        private readonly ToastNotifier notifier;
        private readonly object sync = new object();
        // The future host must create this notifier only after verified installed identity,
        // non-elevated activation registration and explicit user opt-in. Config alone is not proof.
        public WindowsScheduler(ToastNotifier registeredNotifier)
        {
            notifier = registeredNotifier ?? throw new ArgumentNullException(nameof(registeredNotifier));
        }
        public SyncResult Reconcile(DueTask[] tasks, bool authoritative)
        {
            lock (sync)
            {
                try
                {
                    // Validate EVERY row before touching Windows; offline unknown != empty.
                    var wanted = SchedulePlan.Build(tasks, authoritative, DateTimeOffset.UtcNow)
                        .ToDictionary(r => r.Tag, StringComparer.Ordinal);
                    var existing = notifier.GetScheduledToastNotifications()
                        .Where(n => n.Group == SchedulePlan.Group).ToArray();
                    var retained = new HashSet<string>(StringComparer.Ordinal);
                    foreach (var old in existing)
                    {
                        Reservation next;
                        if (wanted.TryGetValue(old.Tag, out next) && old.DeliveryTime == next.Due &&
                            old.Content.GetXml() == ToastDocument().GetXml() && retained.Add(old.Tag)) continue;
                        notifier.RemoveFromSchedule(old);
                    }
                    // Cancellation is attempted even when OS permission is off, including logout.
                    // Do not add while denied. Failure is returned; never label it delivered.
                    if (notifier.Setting != NotificationSetting.Enabled && wanted.Count > 0)
                        return new SyncResult { Error = "os-notifications-disabled" };
                    foreach (var item in wanted.Values)
                    {
                        if (retained.Contains(item.Tag)) continue;
                        if (item.Due <= DateTimeOffset.UtcNow)
                            return new SyncResult { Error = "due-time-elapsed-reconcile-again" };
                        notifier.AddToSchedule(new ScheduledToastNotification(ToastDocument(), item.Due)
                        {
                            Tag = item.Tag,
                            Group = SchedulePlan.Group,
                            ExpirationTime = item.Due.AddMinutes(5),
                            NotificationMirroring = NotificationMirroring.Disabled
                        });
                    }
                    return new SyncResult { Success = true, Pending = notifier.GetScheduledToastNotifications().Count(n => n.Group == SchedulePlan.Group) };
                }
                catch (Exception ex)
                {
                    // OS operations are not transactional: retry the whole authoritative snapshot.
                    // No task content, user paths, or exception messages leave the native boundary.
                    return new SyncResult { Error = "schedule-failed-0x" + ex.HResult.ToString("X8") };
                }
            }
        }
        private static XmlDocument ToastDocument()
        {
            var xml = new XmlDocument();
            xml.LoadXml(SchedulePlan.Payload);
            return xml;
        }
    }
}
