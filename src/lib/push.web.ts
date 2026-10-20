/** Web preview: no phone push (in-app notifications + socket still work). */
export async function registerForPush(_accessToken: string): Promise<void> {}

export const getPushToken = (): string | null => null;

export const setActiveChat = (_id: string | null) => {};
