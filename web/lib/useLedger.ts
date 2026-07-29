"use client";

import { useEffect, useRef, useState } from "react";
import {
  getEvents,
  streamEvents,
  type LedgerEvent,
  type StreamStatus,
} from "./api";

const MAX_ROWS = 200;

export interface Ledger {
  events: LedgerEvent[];
  status: StreamStatus;
  offline: boolean;
  loading: boolean;
  /** txids seen after initial load, for row-in highlight. */
  isFresh: (txid: string) => boolean;
}

/**
 * Load settled payments once, then keep them live over SSE. Dedup + ref mutation
 * happen OUTSIDE the setState updater — React StrictMode double-invokes updaters,
 * and mutating a ref inside one drops every event as "already seen".
 */
export function useLedger(): Ledger {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const seen = useRef<Set<string>>(new Set());
  const freshAfterLoad = useRef<Set<string>>(new Set());
  const loaded = useRef(false);

  function ingest(list: LedgerEvent[]) {
    const fresh = list.filter((e) => e.txid && !seen.current.has(e.txid));
    if (fresh.length === 0) return;
    fresh.forEach((e) => {
      seen.current.add(e.txid);
      if (loaded.current) freshAfterLoad.current.add(e.txid);
    });
    setEvents((prev) => [...fresh, ...prev].slice(0, MAX_ROWS));
  }

  useEffect(() => {
    let es: EventSource | undefined;

    (async () => {
      try {
        ingest(await getEvents());
      } catch {
        setOffline(true);
      } finally {
        loaded.current = true;
        setLoading(false);
      }
    })();

    es = streamEvents((e) => ingest([e]), setStatus);
    return () => es?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    events,
    status,
    offline,
    loading,
    isFresh: (txid) => freshAfterLoad.current.has(txid),
  };
}
