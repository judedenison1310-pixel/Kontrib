import { formatNaira } from "./currency";

interface ReminderMember {
  fullName: string;
  phoneNumber: string;
}

interface ReminderProject {
  name: string;
  targetAmount?: string | null;
  deadline?: string | Date | null;
}

interface ReminderGroup {
  name: string;
  customSlug?: string | null;
  registrationLink?: string | null;
}

export function generateIndividualReminderMessage(
  member: ReminderMember,
  project: ReminderProject,
  group: ReminderGroup
): string {
  const firstName = member.fullName?.split(" ")[0] || "Member";
  const deadline = project.deadline 
    ? new Date(project.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;
  
  let message = `Hi ${firstName},\n\n`;
  message += `This is a friendly reminder to submit your contribution for *${project.name}* in ${group.name}.\n\n`;
  
  if (project.targetAmount && parseFloat(project.targetAmount) > 0) {
    message += `Target: ${formatNaira(project.targetAmount)}\n`;
  }
  
  if (deadline) {
    message += `Deadline: ${deadline}\n`;
  }
  
  message += `\nPlease submit your payment proof on Kontrib when done.\n\n`;
  message += `Thank you!\n\n`;
  message += `— ${group.name} via Kontrib.app`;
  
  return message;
}

export function generateBulkReminderMessage(
  unpaidMembers: ReminderMember[],
  project: ReminderProject,
  group: ReminderGroup
): string {
  const deadline = project.deadline 
    ? new Date(project.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;
  
  let message = `*Payment Reminder - ${project.name}*\n\n`;
  message += `Hello everyone,\n\n`;
  message += `This is a friendly reminder to submit your contributions for *${project.name}* in ${group.name}.\n\n`;
  
  if (project.targetAmount && parseFloat(project.targetAmount) > 0) {
    message += `Target: ${formatNaira(project.targetAmount)}\n`;
  }
  
  if (deadline) {
    message += `Deadline: ${deadline}\n`;
  }
  
  message += `\n*Outstanding members (${unpaidMembers.length}):*\n`;
  unpaidMembers.forEach((member, index) => {
    const firstName = member.fullName?.split(" ")[0] || "Member";
    message += `${index + 1}. ${firstName}\n`;
  });
  
  message += `\nPlease submit your payment proof on Kontrib.app when done.\n\n`;
  message += `Thank you for your cooperation!\n\n`;
  message += `— ${group.name} via Kontrib.app`;
  
  return message;
}

export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") 
    ? `234${cleanPhone.substring(1)}` 
    : cleanPhone.startsWith("234") 
      ? cleanPhone 
      : `234${cleanPhone}`;
  
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
