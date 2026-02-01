import type { IUser } from "./user.js";

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
}
