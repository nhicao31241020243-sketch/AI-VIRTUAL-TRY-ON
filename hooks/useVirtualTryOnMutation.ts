'use client';

import { useMutation } from '@tanstack/react-query';
import { createVirtualTryOn } from '@/services/api';
import type { TryOnRequest } from '@/types/virtual-try-on';

export function useVirtualTryOnMutation() {
  return useMutation({
    mutationFn: (request: TryOnRequest) => createVirtualTryOn(request),
  });
}
