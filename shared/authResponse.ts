import { IUser } from "@shared/user";

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
}
