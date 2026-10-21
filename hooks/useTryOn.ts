'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { imageToDataUrl } from '@/lib/image';
import { getTryOnStatus, startTryOn, TryOnNetworkError } from '@/services/tryon';
import { recordMetric } from '@/lib/metrics';
import { TRYON_CONFIG } from '@/lib/tryon-config';
import type { Product } from '@/types/product';
import type { TryOnPredictionInput } from '@/types/virtual-try-on';

export type TryOnStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface TryOnState {
  status: TryOnStatus;
  beforeImageUrl: string | null;
  resultImageUrl: string | null;
  error: string | null;
  inferenceTimeMs: number | null;
}

const INITIAL_STATE: TryOnState = {
  status: 'idle',
  beforeImageUrl: null,
  resultImageUrl: null,
  error: null,
  inferenceTimeMs: null,
};
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = TRYON_CONFIG.timeoutMs;
const CLEANUP_AFTER_MS = 5 * 60_000;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Đã hủy lượt thử đồ.', 'AbortError'));
      return;
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);
    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Đã hủy lượt thử đồ.', 'AbortError'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
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
    setState(INITIAL_STATE);
  }, [clearCleanupTimer]);

  const start = useCallback(async (
    source: File | string,
    product: Product,
    garmentImage: string,
    color: string,
    size: string,
  ) => {
    if (activeController.current) return;

    const controller = new AbortController();
    activeController.current = controller;
    clearCleanupTimer();
    cleanupTimer.current = window.setTimeout(() => {
      controller.abort();
      if (activeController.current === controller) activeController.current = null;
      setState(INITIAL_STATE);
    }, CLEANUP_AFTER_MS);
    requestTimeout.current = window.setTimeout(() => {
      controller.abort(new DOMException('Thời gian xử lý đã hết.', 'TimeoutError'));
    }, TIMEOUT_MS);
    setState({ ...INITIAL_STATE, status: 'uploading' });

    const startedAt = Date.now();
    let inferenceStartedAt: number | null = null;
    try {
      const [humanImg, garmentImg] = await withAbort(Promise.all([
        imageToDataUrl(source),
        imageToDataUrl(garmentImage),
      ]), controller.signal);
      if (controller.signal.aborted) return;

      inferenceStartedAt = Date.now();
      setState((current) => ({ ...current, status: 'processing', beforeImageUrl: humanImg }));
      if (DEMO_MODE) {
        await wait(3000, controller.signal);
        const inferenceTimeMs = Date.now() - inferenceStartedAt;
        setState({
          status: 'success',
          beforeImageUrl: humanImg,
          resultImageUrl: '/models/demo-result.svg',
          error: null,
          inferenceTimeMs,
        });
        if (process.env.NODE_ENV === 'development') {
          console.info(`[TryOn] inferenceTimeMs=${inferenceTimeMs}`);
        }
        recordMetric({ type: 'success', at: Date.now(), inferenceTimeMs });
        return;
      }

      const input: TryOnPredictionInput = {
        humanImg,
        garmentImg,
        garmentDesc: `${product.name}, màu ${color}, kích thước ${size}. ${product.description}`,
        category: product.category,
      };
      const deadline = startedAt + TIMEOUT_MS;
      let predictionId: string | null = null;
      let networkRetries = 0;

      while (!predictionId) {
        try {
          predictionId = await startTryOn(input, controller.signal);
        } catch (error) {
          if (!(error instanceof TryOnNetworkError) || networkRetries >= 2) throw error;
          networkRetries += 1;
          await wait(400 * networkRetries, controller.signal);
        }
      }

      networkRetries = 0;
      while (Date.now() < deadline) {
        await wait(POLL_INTERVAL_MS, controller.signal);
        let result;
        try {
          result = await getTryOnStatus(predictionId, controller.signal);
          networkRetries = 0;
        } catch (error) {
          if (!(error instanceof TryOnNetworkError) || networkRetries >= 2) throw error;
          networkRetries += 1;
          await wait(400 * networkRetries, controller.signal);
          continue;
        }

        if (result.status === 'failed' || result.status === 'canceled') {
          throw new Error(result.error ?? 'AI chưa thể tạo kết quả. Vui lòng thử lại.');
        }
        if (result.status === 'succeeded') {
          if (!result.output) throw new Error('AI hoàn tất nhưng không trả về ảnh kết quả.');
          const inferenceTimeMs = Date.now() - inferenceStartedAt;
          setState({
            status: 'success',
            beforeImageUrl: humanImg,
            resultImageUrl: result.output,
            error: null,
            inferenceTimeMs,
          });
          if (process.env.NODE_ENV === 'development') {
            console.info(`[TryOn] inferenceTimeMs=${inferenceTimeMs}`);
          }
          recordMetric({ type: 'success', at: Date.now(), inferenceTimeMs });
          return;
        }
      }
      throw new Error('Lượt thử đồ đã quá thời gian chờ 60 giây. Vui lòng thử lại.');
    } catch (error) {
      const timedOut = controller.signal.reason instanceof Error
        && controller.signal.reason.name === 'TimeoutError';
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
          error: 'Lượt thử đồ đã quá thời gian chờ 60 giây. Vui lòng thử lại.',
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

  useEffect(() => () => {
    clearCleanupTimer();
    activeController.current?.abort();
    activeController.current = null;
  }, [clearCleanupTimer]);

  return { state, start, reset };
}
