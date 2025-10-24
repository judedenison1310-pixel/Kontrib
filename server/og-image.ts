import { createCanvas, loadImage, registerFont } from 'canvas';
import { storage } from './storage';
import path from 'path';

export async function generateOGImage(groupIdentifier: string): Promise<Buffer | null> {
  try {
    // Try custom slug first, then fall back to registration link
    let group = await storage.getGroupByCustomSlug(groupIdentifier);
    
    if (!group) {
      group = await storage.getGroupByRegistrationLink(groupIdentifier);
    }
    
    if (!group) {
      return null;
    }

    // Get projects for this group
    const projects = await storage.getProjectsByGroup(group.id);
    const firstProject = projects[0];
    
    // Get member count
    const members = await storage.getGroupMembers(group.id);
    const memberCount = members.length;

    // Calculate totals
    let totalTarget = 0;
    let totalCollected = 0;
    
    for (const project of projects) {
      totalTarget += parseFloat(project.targetAmount);
      totalCollected += parseFloat(project.collectedAmount);
    }

    const progressPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0;

    // Format amounts
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount).replace('NGN', 'N');
    };

    const collectedFormatted = formatAmount(totalCollected);
    const targetFormatted = formatAmount(totalTarget);

    // Format deadline
    let deadlineText = '';
    if (firstProject?.deadline) {
      const deadline = new Date(firstProject.deadline);
      deadlineText = deadline.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Create canvas
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // === LOGO HEADER ===
    let yPos = 35;

    // Load and draw official Kontrib logo
    try {
      const logoPath = path.join(process.cwd(), 'server', 'assets', 'kontrib-logo.jpg');
      const logo = await loadImage(logoPath);
      
      // Calculate logo dimensions (maintain aspect ratio) - increased by 50%
      const logoHeight = 120;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      
      // Center the logo horizontally
      const logoX = (width - logoWidth) / 2;
      
      ctx.drawImage(logo, logoX, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 30; // Logo height + reduced padding
    } catch (error) {
      console.error('Error loading Kontrib logo, using fallback:', error);
      
      // Fallback: Draw hexagon logo if image fails to load
      const hexCenterX = width / 2 - 150;
      const hexCenterY = yPos + 30;
      const hexRadius = 30;
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = hexCenterX + hexRadius * Math.cos(angle);
        const y = hexCenterY + hexRadius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = '#16a34a';
      ctx.fill();

      // Draw "Kontrib" text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText('Kontrib', hexCenterX + 60, yPos + 45);
      
      yPos += 110;
    }

    // === GROUP CARD ===
    const cardX = 60;
    const cardY = yPos;
    const cardWidth = width - 120;
    const cardHeight = height - yPos - 60;

    // Card border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

    // Card content padding
    const contentX = cardX + 40;
    let contentY = cardY + 40;

    // === GROUP ICON AND NAME ===
    // Green square icon
    const iconSize = 80;
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, iconSize, iconSize, 12);
    ctx.fill();

    // User icon in the center (simplified)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(contentX + iconSize/2, contentY + 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(contentX + iconSize/2, contentY + 65, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Group name (truncate if too long)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 42px sans-serif';
    const groupNameText = group.name.length > 25 ? group.name.substring(0, 25) + '...' : group.name;
    ctx.fillText(groupNameText, contentX + iconSize + 20, contentY + 35);

    // Project name/description (truncate if too long)
    if (firstProject) {
      const projectText = firstProject.name || firstProject.description || '';
      if (projectText) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '28px sans-serif';
        const truncatedText = projectText.length > 50 ? projectText.substring(0, 50) + '...' : projectText;
        ctx.fillText(truncatedText, contentX + iconSize + 20, contentY + 70);
      }
    }

    contentY += 120;

    // === PROGRESS SECTION ===
    // Collected amount
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(collectedFormatted, contentX, contentY);

    const collectedWidth = ctx.measureText(collectedFormatted).width;

    // "don enter" text
    ctx.fillStyle = '#6b7280';
    ctx.font = '28px sans-serif';
    ctx.fillText('don enter', contentX + collectedWidth + 12, contentY);

    // "out of" and target amount (right aligned)
    const outOfText = 'out of';
    const outOfWidth = ctx.measureText(outOfText).width;
    ctx.fillText(outOfText, cardX + cardWidth - 40 - ctx.measureText(targetFormatted).width - outOfWidth - 8, contentY);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(targetFormatted, cardX + cardWidth - 40 - ctx.measureText(targetFormatted).width, contentY);

    contentY += 30;

    // === PROGRESS BAR ===
    const barWidth = cardWidth - 80;
    const barHeight = 56;
    const barX = contentX;
    const barY = contentY;

    // Background bar
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 12);
    ctx.fill();

    // Progress bar (filled portion)
    if (progressPercentage > 0) {
      const filledWidth = (barWidth * progressPercentage) / 100;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(barX, barY, filledWidth, barHeight, 12);
      ctx.fill();
    }

    // Percentage text (centered)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    const percentText = `${progressPercentage}%`;
    const percentWidth = ctx.measureText(percentText).width;
    ctx.fillText(percentText, barX + (barWidth - percentWidth) / 2, barY + 38);

    contentY += 90;

    // === DEADLINE ===
    if (deadlineText) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '24px sans-serif';
      const remainText = 'E remain till';
      const remainWidth = ctx.measureText(remainText).width;
      ctx.fillText(remainText, barX + (barWidth - remainWidth) / 2, contentY);

      contentY += 35;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 36px sans-serif';
      const deadlineWidth = ctx.measureText(deadlineText).width;
      ctx.fillText(deadlineText, barX + (barWidth - deadlineWidth) / 2, contentY);

      contentY += 50;
    }

    // === INFO BOX ===
    const infoBoxY = cardY + cardHeight - 140;
    const infoBoxHeight = 120;

    // Gray background
    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.roundRect(contentX, infoBoxY, barWidth, infoBoxHeight, 12);
    ctx.fill();

    // Tagline
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText("Let's keep it transparent!", contentX + 20, infoBoxY + 35);

    // CTA text
    ctx.font = '22px sans-serif';
    ctx.fillText('Join Kontrib to track your contributions', contentX + 20, infoBoxY + 65);

    // Member count
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 26px sans-serif';
    const memberText = `${memberCount} ${memberCount === 1 ? 'Member' : 'Members'} Joined`;
    ctx.fillText(memberText, contentX + 20, infoBoxY + 100);

    // Return PNG buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating OG image:', error);
    return null;
  }
}
