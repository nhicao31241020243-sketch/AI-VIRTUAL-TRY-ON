'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareImage } from '@/lib/image';
import { startTryOn } from '@/services/tryon';
import { recordMetric } from '@/lib/metrics';
import { TRYON_CONFIG } from '@/lib/tryon-config';
import type { Product } from '@/types/product';
import type { TryOnProvider } from '@/types/virtual-try-on';

export type TryOnStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface TryOnState {
  status: TryOnStatus;
  beforeImageUrl: string | null;
  resultImageUrl: string | null;
  provider: TryOnProvider | null;
  error: string | null;
  inferenceTimeMs: number | null;
}

const INITIAL_STATE: TryOnState = {
  status: 'idle',
  beforeImageUrl: null,
  resultImageUrl: null,
  provider: null,
  error: null,
  inferenceTimeMs: null,
};
const TIMEOUT_MS = TRYON_CONFIG.timeoutMs;
const CLEANUP_AFTER_MS = 5 * 60_000;

interface LastTryOnRequest {
  source: File | string;
  product: Product;
  color: string;
  size: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isTimeoutReason(reason: unknown): boolean {
  return typeof reason === 'object'
    && reason !== null
    && 'name' in reason
    && reason.name === 'TimeoutError';
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      reject(signal.reason instanceof Error
        ? signal.reason
        : new DOMException('Đã hủy lượt thử đồ.', 'AbortError'));
    };
    if (signal.aborted) {
      handleAbort();
      return;
    }
    signal.addEventListener('abort', handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

export function useTryOn() {
  const [state, setState] = useState<TryOnState>(INITIAL_STATE);
  const activeController = useRef<AbortController | null>(null);
  const cleanupTimer = useRef<number | null>(null);
  const requestTimeout = useRef<number | null>(null);
  const lastRequest = useRef<LastTryOnRequest | null>(null);

  const clearCleanupTimer = useCallback(() => {
    if (cleanupTimer.current !== null) {
      window.clearTimeout(cleanupTimer.current);
      cleanupTimer.current = null;
    }
    if (requestTimeout.current !== null) {
      window.clearTimeout(requestTimeout.current);
      requestTimeout.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    activeController.current?.abort();
    activeController.current = null;
    clearCleanupTimer();
    lastRequest.current = null;
    setState(INITIAL_STATE);
  }, [clearCleanupTimer]);

  const start = useCallback(async (
    source: File | string,
    product: Product,
    color: string,
    size: string,
  ) => {
    if (activeController.current) return;

    lastRequest.current = { source, product, color, size };
    const controller = new AbortController();
    activeController.current = controller;
    clearCleanupTimer();
    cleanupTimer.current = window.setTimeout(() => {
      controller.abort();
      if (activeController.current === controller) activeController.current = null;
      lastRequest.current = null;
      setState(INITIAL_STATE);
    }, CLEANUP_AFTER_MS);
    requestTimeout.current = window.setTimeout(() => {
      controller.abort(new DOMException('Thời gian xử lý đã hết.', 'TimeoutError'));
    }, TIMEOUT_MS);
    setState({ ...INITIAL_STATE, status: 'uploading' });

    let inferenceStartedAt: number | null = null;
    try {
      const preparedImage = await withAbort(prepareImage(source), controller.signal);
      if (controller.signal.aborted) return;

      inferenceStartedAt = Date.now();
      setState((current) => ({ ...current, status: 'processing', beforeImageUrl: preparedImage.dataUrl }));
      const result = await startTryOn({
        image: preparedImage.file,
        productId: product.id,
        color,
        size,
      }, controller.signal);
      if (controller.signal.aborted) return;

      const inferenceTimeMs = Date.now() - inferenceStartedAt;
      setState({
        status: 'success',
        beforeImageUrl: preparedImage.dataUrl,
        resultImageUrl: result.image,
        provider: result.provider,
        error: null,
        inferenceTimeMs,
      });
      if (process.env.NODE_ENV === 'development') {
        console.info(`[TryOn] inferenceTimeMs=${inferenceTimeMs}`);
      }
      recordMetric({ type: 'success', at: Date.now(), inferenceTimeMs });
    } catch (error) {
      const timedOut = isTimeoutReason(controller.signal.reason);
      const inferenceTimeMs = inferenceStartedAt === null
        ? null
        : Date.now() - inferenceStartedAt;
      if (inferenceTimeMs !== null && process.env.NODE_ENV === 'development') {
        console.info(`[TryOn] inferenceTimeMs=${inferenceTimeMs}`);
      }
      if (timedOut) {
        setState((current) => ({
          ...current,
          status: 'error',
          error: 'Lượt thử đồ đã quá thời gian chờ. Vui lòng thử lại.',
        }));
        recordMetric({
          type: 'error',
          at: Date.now(),
          ...(inferenceTimeMs === null ? {} : { inferenceTimeMs }),
        });
      } else if (!isAbortError(error) && !controller.signal.aborted) {
        setState((current) => ({
          ...current,
          status: 'error',
          error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thử đồ. Vui lòng thử lại.',
        }));
        recordMetric({
          type: 'error',
          at: Date.now(),
          ...(inferenceTimeMs === null ? {} : { inferenceTimeMs }),
        });
      }
    } finally {
      if (requestTimeout.current !== null) {
        window.clearTimeout(requestTimeout.current);
        requestTimeout.current = null;
      }
      if (activeController.current === controller) activeController.current = null;
    }
  }, [clearCleanupTimer]);

  const retry = useCallback(() => {
    const previousRequest = lastRequest.current;
    if (previousRequest) {
      void start(
        previousRequest.source,
        previousRequest.product,
        previousRequest.color,
        previousRequest.size,
      );
    }
  }, [start]);

  useEffect(() => () => {
    clearCleanupTimer();
    activeController.current?.abort();
    activeController.current = null;
    lastRequest.current = null;
  }, [clearCleanupTimer]);

  return { state, start, retry, reset };
}
