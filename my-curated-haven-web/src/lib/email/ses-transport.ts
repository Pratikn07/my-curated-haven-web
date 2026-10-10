import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { consumeLocalFault } from "../admin/support/test-faults";
import type { NoticePayload, NoticeSendResult } from "../admin/support/notices/contracts";
import { noticeAccepted, noticeErrorResult } from "./notice-outcomes";

/**
 * The server-only transport for owner-approved notices. Amazon SES v2 SendEmail, one attempt, a ten-second budget,
 * a simple plain-text message with the operation as a tag and no tracking. The sender, reply-to and region come from
 * server configuration; no caller chooses them. A returned message id means accepted, not delivered. SES has no
 * idempotency token here, so the caller never resends after an unknown answer.
 *
 * On a local test stack (SUPPORT_PROVIDER_FIXTURE=local-ledger, not deployed, test-mode order) the email is written to
 * a file instead, so browser tests can read exactly what would have been sent.
 */

export type NoticeTransport = { send(payload: NoticePayload): Promise<NoticeSendResult> };
export const LOCAL_MAIL_DIR = join(tmpdir(), "mch-support-test-mail");

function localTransport(): NoticeTransport {
  return {
    async send(payload) {
      if (consumeLocalFault("notice-rejected")) return { kind: "not_executed", code: "MESSAGE_REJECTED" };
      mkdirSync(LOCAL_MAIL_DIR, { recursive: true });
      writeFileSync(join(LOCAL_MAIL_DIR, `${payload.operationId}.json`), JSON.stringify(payload));
      // An email the provider took whose answer never came back.
      if (consumeLocalFault("notice-timeout-after-acceptance")) return { kind: "unknown", code: "TRANSPORT_OUTCOME_UNKNOWN" };
      return { kind: "accepted", providerMessageId: `local-${payload.operationId}` };
    },
  };
}

function sesTransport(): NoticeTransport {
  const from = process.env.SUPPORT_NOTICE_FROM?.trim();
  const replyTo = process.env.SUPPORT_NOTICE_REPLY_TO?.trim();
  const region = process.env.SUPPORT_NOTICE_SES_REGION?.trim();
  return {
    async send(payload) {
      if (!from || !replyTo || !region) return { kind: "not_executed", code: "TRANSPORT_UNCONFIGURED" };
      const client = new SESv2Client({ region, maxAttempts: 1 });
      try {
        const sent = await client.send(new SendEmailCommand({
          FromEmailAddress: from,
          ReplyToAddresses: [replyTo],
          Destination: { ToAddresses: [payload.recipient] },
          Content: { Simple: { Subject: { Data: payload.subject, Charset: "UTF-8" }, Body: { Text: { Data: payload.text, Charset: "UTF-8" } } } },
          EmailTags: [{ Name: "support_notice_operation", Value: payload.operationId }],
        }), { abortSignal: AbortSignal.timeout(10_000) });
        return noticeAccepted(sent.MessageId);
      } catch (error) {
        return noticeErrorResult(error);
      } finally {
        client.destroy();
      }
    },
  };
}

export function createNoticeTransport(payload: Pick<NoticePayload, "mode">): NoticeTransport {
  const local = process.env.SUPPORT_PROVIDER_FIXTURE === "local-ledger" && process.env.VERCEL_ENV === undefined && payload.mode === "test";
  return local ? localTransport() : sesTransport();
}
