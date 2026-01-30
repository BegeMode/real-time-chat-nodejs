import type { IAuthResponse } from '@shared/index.js';

export interface IAuthResponseWithRefresh extends IAuthResponse {
  refreshToken: string;
}
