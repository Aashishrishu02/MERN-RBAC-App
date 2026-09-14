/// <reference types="vite/client" />
import axios from 'axios';
import { AuthResponse, Role, Attendance, Visit } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fieldops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  googleLogin: async (email: string, name?: string, googleId?: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/google', { email, name, googleId });
    return res.data;
  },
  register: async (name: string, email: string, password: string, roleId?: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', { name, email, password, roleId });
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const roleService = {
  getRoles: async (): Promise<{ roles: Role[]; availablePermissions: string[] }> => {
    const res = await api.get('/roles');
    return res.data;
  },
  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<{ role: Role }> => {
    const res = await api.put(`/roles/${roleId}/permissions`, { permissions });
    return res.data;
  },
};

export const attendanceService = {
  clockIn: async (note?: string): Promise<{ attendance: Attendance }> => {
    const res = await api.post('/attendance/clock-in', { note });
    return res.data;
  },
  clockOut: async (note?: string): Promise<{ attendance: Attendance }> => {
    const res = await api.post('/attendance/clock-out', { note });
    return res.data;
  },
  getSelfAttendance: async (): Promise<{ attendance: Attendance[] }> => {
    const res = await api.get('/attendance/my');
    return res.data;
  },
  getAllAttendance: async (): Promise<{ attendance: Attendance[] }> => {
    const res = await api.get('/attendance/all');
    return res.data;
  },
};

export const visitService = {
  saveVisit: async (visitData: {
    customerName: string;
    purpose: string;
    outcome: string;
    locationAddress: string;
    visitDate?: string;
  }): Promise<{ visit: Visit }> => {
    const res = await api.post('/visits', visitData);
    return res.data;
  },
  getSelfVisits: async (): Promise<{ visits: Visit[] }> => {
    const res = await api.get('/visits/my');
    return res.data;
  },
  getAllVisits: async (): Promise<{ visits: Visit[] }> => {
    const res = await api.get('/visits/all');
    return res.data;
  },
};
