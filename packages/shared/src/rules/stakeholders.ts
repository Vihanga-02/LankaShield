import type { AppUser, Stakeholder, StakeholderNotification } from '../models';
import { STAKEHOLDERS, STAKEHOLDER_LABELS } from '../models';

export function resolveStakeholderRecipients(
  notification: Pick<StakeholderNotification, 'stakeholders' | 'district'>,
  users: AppUser[],
): string[] {
  const recipients = new Set<string>();
  for (const group of notification.stakeholders) {
    const matches = users.filter((user) => {
      if (!user.active) return false;
      if ((STAKEHOLDERS as readonly string[]).includes(group)) return user.role === group;
      // Preserve delivery of previously saved stakeholder groups.
      if (user.district && user.district !== notification.district) return false;
      if (String(group) === 'AFFECTED_CITIZENS')
        return user.role === 'CITIZEN' && user.district === notification.district;
      if (String(group) === 'DISTRICT_OFFICERS')
        return user.role === 'DISTRICT_OFFICER' && user.district === notification.district;
      if (String(group) === 'DMC_OFFICERS')
        return user.role === 'DMC_ANALYST' || user.role === 'DUTY_OFFICER';
      return user.stakeholderGroups?.includes(group as Stakeholder);
    });
    if (!matches.length)
      throw new Error(
        'No registered recipients for ' +
          STAKEHOLDER_LABELS[group] +
          ' in ' +
          notification.district +
          '.',
      );
    matches.forEach((user) => recipients.add(user.uid));
  }
  if (!recipients.size) throw new Error('No stakeholders selected.');
  return [...recipients];
}
