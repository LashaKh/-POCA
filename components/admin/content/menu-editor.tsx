"use client";

import { useActionState } from "react";

import {
  configureContactChannelAction,
  configureContentRedirectAction,
  publishContentMenuAction,
  type ContentActionState,
} from "@/features/content/admin-actions";
import type { AppLocale } from "@/i18n/routing";

type Menu = { menu_key: string; status: string; version: number };
type Redirect = {
  id: string;
  source_path: string;
  destination_path: string;
  http_status: number;
  status: string;
  active_from: string;
  active_until: string;
  version: number;
};
type Channel = {
  id: string;
  channel_key: string;
  channel_type: string;
  public_value: string;
  labels_i18n: unknown;
  enabled: boolean;
  verified_at: string | null;
  configuration_status: string;
  version: number;
};

export function MenuEditor({
  locale,
  menu,
  initialItems,
  labels,
}: {
  locale: AppLocale;
  menu: Menu;
  initialItems: unknown[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ContentActionState, FormData>(
    publishContentMenuAction,
    undefined,
  );
  return (
    <form className="admin-panel settings-form-grid" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="menuKey" value={menu.menu_key} />
      <input type="hidden" name="expectedVersion" value={menu.version} />
      <h2>{menu.menu_key}</h2>
      <label>
        <span>{labels.status}</span>
        <select name="status" defaultValue={menu.status}>
          <option value="draft">{labels.draft}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.menuItems}</span>
        <textarea
          className="code-textarea"
          name="items"
          rows={16}
          defaultValue={JSON.stringify(initialItems, null, 2)}
          required
        />
      </label>
      <p className="field-hint">{labels.menuHint}</p>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.publishMenu}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}

export function RedirectEditor({
  locale,
  redirect,
  labels,
}: {
  locale: AppLocale;
  redirect?: Redirect;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ContentActionState, FormData>(
    configureContentRedirectAction,
    undefined,
  );
  return (
    <form className="admin-panel settings-form-grid" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirectId" value={redirect?.id ?? ""} />
      <input
        type="hidden"
        name="expectedVersion"
        value={redirect?.version ?? 0}
      />
      <h2>{redirect?.source_path ?? labels.newRedirect}</h2>
      <label>
        <span>{labels.source}</span>
        <input
          name="sourcePath"
          defaultValue={redirect?.source_path ?? ""}
          required
        />
      </label>
      <label>
        <span>{labels.destination}</span>
        <input
          name="destinationPath"
          defaultValue={redirect?.destination_path ?? ""}
          required
        />
      </label>
      <label>
        <span>{labels.httpStatus}</span>
        <select name="httpStatus" defaultValue={redirect?.http_status ?? 308}>
          <option value="301">301</option>
          <option value="302">302</option>
          <option value="307">307</option>
          <option value="308">308</option>
        </select>
      </label>
      <label>
        <span>{labels.status}</span>
        <select name="status" defaultValue={redirect?.status ?? "draft"}>
          <option value="draft">{labels.draft}</option>
          <option value="scheduled">{labels.scheduled}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.activeFrom}</span>
        <input
          name="activeFrom"
          type="datetime-local"
          defaultValue={
            redirect?.active_from.slice(0, 16) ??
            new Date().toISOString().slice(0, 16)
          }
          required
        />
      </label>
      <label>
        <span>{labels.activeUntil}</span>
        <input
          name="activeUntil"
          defaultValue={
            redirect?.active_until === "infinity"
              ? "infinity"
              : (redirect?.active_until.slice(0, 16) ?? "infinity")
          }
          required
        />
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}

function labelValue(value: unknown, locale: string) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? String((value as Record<string, unknown>)[locale] ?? "")
    : "";
}

export function ContactChannelEditor({
  locale,
  channel,
  labels,
}: {
  locale: AppLocale;
  channel?: Channel;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ContentActionState, FormData>(
    configureContactChannelAction,
    undefined,
  );
  return (
    <form className="admin-panel settings-form-grid" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="channelId" value={channel?.id ?? ""} />
      <input
        type="hidden"
        name="expectedVersion"
        value={channel?.version ?? 0}
      />
      <h2>{channel?.channel_key ?? labels.newChannel}</h2>
      <label>
        <span>{labels.key}</span>
        <input
          name="channelKey"
          defaultValue={channel?.channel_key ?? ""}
          required
        />
      </label>
      <label>
        <span>{labels.type}</span>
        <select
          name="channelType"
          defaultValue={channel?.channel_type ?? "email"}
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="messaging">Messaging</option>
        </select>
      </label>
      <label>
        <span>{labels.value}</span>
        <input
          name="publicValue"
          defaultValue={channel?.public_value ?? ""}
          required
        />
      </label>
      {(["ka", "en", "de", "ru"] as const).map((candidate) => (
        <label key={candidate}>
          <span>
            {labels.label} · {candidate.toUpperCase()}
          </span>
          <input
            name={`label_${candidate}`}
            defaultValue={labelValue(channel?.labels_i18n, candidate)}
            required
          />
        </label>
      ))}
      <label className="checkbox-field">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={channel?.enabled}
        />
        <span>{labels.enabled}</span>
      </label>
      <label className="checkbox-field">
        <input
          name="verified"
          type="checkbox"
          defaultChecked={Boolean(channel?.verified_at)}
        />
        <span>{labels.verified}</span>
      </label>
      <label>
        <span>{labels.status}</span>
        <select
          name="configurationStatus"
          defaultValue={channel?.configuration_status ?? "draft"}
        >
          <option value="draft">{labels.draft}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}
