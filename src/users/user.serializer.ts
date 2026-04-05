import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PublicUser } from './users.select';

type SerializableUser = PublicUser & {
  passwordHash?: string;
};

export function toPublicUser(user: SerializableUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toAuthenticatedUser(user: SerializableUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}
