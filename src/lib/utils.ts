import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import api from '@/lib/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function generateInvoiceNumber(): Promise<string> {
  // Generate unique invoice number with timestamp and random
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `INV-${timestamp}-${random}`;
}

// Simple rate limiting for activity logs
const activityLogQueue: Array<{action: string, details?: Record<string, any>}> = [];
let isProcessingQueue = false;

async function processActivityQueue() {
  if (isProcessingQueue || activityLogQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (activityLogQueue.length > 0) {
    const log = activityLogQueue.shift();
    if (log) {
      try {
        await api.post('/activity', {
          action: log.action,
          details: log.details ? JSON.stringify(log.details) : null
        });
        // Wait 100ms between logs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        // If rate limited, put it back and wait longer
        if (error.response?.status === 429) {

          activityLogQueue.unshift(log); // Put back at front
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } else {

        }
      }
    }
  }
  
  isProcessingQueue = false;
}

export async function logActivity(action: string, details?: Record<string, any>) {
  // Add to queue instead of immediate execution
  activityLogQueue.push({ action, details });
  
  // Start processing if not already running
  if (!isProcessingQueue) {
    processActivityQueue().catch(() => {
      // Silently handle errors
    });
  }
}