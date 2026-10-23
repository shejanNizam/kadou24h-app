/**
 * Side effects of being signed in (no UI):
 * - keeps the socket connected with the current token
 * - server ended the session (suspension, password reset, logout-all) → sign out
 * - refreshes the cached user once per launch
 * - order / payment / delivery / wallet / rider-link / application events → refetch what is on screen
 */
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useGetMeQuery } from '@/features/auth/api';
import { pendingAuth } from '@/features/auth/pending';
import { api } from '@/lib/api/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { signedOut, userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const WALLET_EVENTS = ['wallet:earning_released', 'withdrawal:requested', 'withdrawal:completed', 'withdrawal:rejected', 'cod_settlement:confirmed', 'cod_settlement:rejected'];
const JOB_EVENTS = ['job_application:new', 'job_application:status_changed', 'job_application:interview_scheduled'];
const ORDER_EVENTS = ['new_notification', 'delivery:status_changed', 'delivery:assigned', 'delivery:withdrawn', 'payment:successful', 'refund:requested', 'refund:issued'];
// Rider: an open delivery appeared near me, or someone else took it
const OFFER_EVENTS = ['delivery:offer', 'delivery:offer_gone', 'ride:offer', 'ride:offer_gone'];

export function SessionEffects() {
  const dispatch = useAppDispatch();
  const { status, accessToken } = useAppSelector((s) => s.auth);
  const signedIn = status === 'signedIn';

  const { data: me } = useGetMeQuery(undefined, { skip: !signedIn });
  useEffect(() => {
    if (me) dispatch(userUpdated(me));
  }, [me, dispatch]);

  useEffect(() => {
    if (!signedIn || !accessToken) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket(accessToken);
    const onRevoked = ({ reason }: { reason?: string } = {}) => {
      // Password changed on this phone: we already hold the new tokens
      if (reason === 'password_changed' && pendingAuth.passwordChangedHereRecently()) return;
      dispatch(signedOut({ reason: reason ?? 'revoked' }));
      // Suspended / banned by the team: say so clearly, with a way to contact support
      if (reason === 'account_suspended' || reason === 'account_banned') {
        router.replace({ pathname: '/suspended', params: { status: reason.replace('account_', '') } });
      }
    };
    // Vendor status changes arrive as notifications; riders send delivery events
    // (payment:successful also finishes job / CV-unlock / plan / spontaneous payments)
    // (Cart: an unpaid online order that expires puts its items back in the cart)
    const refreshOrders = () =>
      dispatch(api.util.invalidateTags(['Order', 'SubOrder', 'Cart', 'Delivery', 'DeliveryOffer', 'Notification', 'Wallet', 'Job', 'Application', 'Cv', 'Subscription']));
    const refreshOffers = () => dispatch(api.util.invalidateTags(['DeliveryOffer', 'RideOffer']));
    // Moto-taxi: a ride changed (accepted, arrived, finished, cancelled…), for the passenger and the rider
    const refreshRides = () => dispatch(api.util.invalidateTags(['Ride', 'RideOffer']));
    const refreshJobs = () => dispatch(api.util.invalidateTags(['Job', 'Application']));
    const refreshChats = () => dispatch(api.util.invalidateTags(['Conversation']));
    const refreshTickets = () => dispatch(api.util.invalidateTags(['Ticket']));
    const refreshDisputes = () => dispatch(api.util.invalidateTags(['Dispute', 'Order']));
    const refreshWallet = () => dispatch(api.util.invalidateTags(['Wallet', 'CodSettlement']));
    const refreshLinks = () => dispatch(api.util.invalidateTags(['RiderLink']));
    // A booking changed (request, answer, done, review): both people's screens
    const refreshBookings = () => dispatch(api.util.invalidateTags(['Booking', 'Cv', 'Notification']));
    // Vendor / rider application reviewed: roles and status change
    const refreshApplication = () => dispatch(api.util.invalidateTags(['Me', 'Store', 'Rider', 'Cv']));
    socket.on('session:revoked', onRevoked);
    ORDER_EVENTS.forEach((e) => socket.on(e, refreshOrders));
    OFFER_EVENTS.forEach((e) => socket.on(e, refreshOffers));
    socket.on('ride:updated', refreshRides);
    socket.on('dispute:resolved', refreshDisputes);
    socket.on('conversation_unread', refreshChats);
    socket.on('ticket_update', refreshTickets);
    WALLET_EVENTS.forEach((e) => socket.on(e, refreshWallet));
    socket.on('delivery:declined', refreshOrders);
    socket.on('rider_link:updated', refreshLinks);
    socket.on('application:reviewed', refreshApplication);
    socket.on('booking:updated', refreshBookings);
    JOB_EVENTS.forEach((e) => socket.on(e, refreshJobs));
    return () => {
      socket.off('session:revoked', onRevoked);
      ORDER_EVENTS.forEach((e) => socket.off(e, refreshOrders));
      OFFER_EVENTS.forEach((e) => socket.off(e, refreshOffers));
      socket.off('ride:updated', refreshRides);
      socket.off('dispute:resolved', refreshDisputes);
      socket.off('conversation_unread', refreshChats);
      socket.off('ticket_update', refreshTickets);
      WALLET_EVENTS.forEach((e) => socket.off(e, refreshWallet));
      socket.off('delivery:declined', refreshOrders);
      socket.off('rider_link:updated', refreshLinks);
      socket.off('application:reviewed', refreshApplication);
      socket.off('booking:updated', refreshBookings);
      JOB_EVENTS.forEach((e) => socket.off(e, refreshJobs));
    };
  }, [signedIn, accessToken, dispatch]);

  return null;
}
