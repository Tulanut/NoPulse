import React, { useState, useMemo, useRef } from 'react';
import {
  Camera,
  Check,
  Calendar,
  Flame,
  Award,
  Zap,
  TrendingUp,
  Download,
  Trash2,
} from 'lucide-react';
import { Workout } from '../types/workout';
import { UserProfileData } from '../types/user';
import { formatSpelledDate } from '../utils/dateUtils';

interface UserProfileViewProps {
  workouts: Workout[];
  onBackToHome: () => void;
}

const DEFAULT_PROFILE: UserProfileData = {
  username: 'IronAthlete',
  email: 'athlete@ironpulse.local',
  avatarUrl: null,
  bio: 'Consistency over intensity. Building strength daily.',
  memberSince: '2026-08-01',
};

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  workouts,
}) => {
  // Load saved local profile or fallback to defaults
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const saved = localStorage.getItem('ironpulse_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PROFILE;
      }
    }
    return DEFAULT_PROFILE;
  });

  // Edit fields
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [emailInput, setEmailInput] = useState(profile.email);
  const [bioInput, setBioInput] = useState(profile.bio || '');

  // Password fields (Skeleton)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Alerts & Messages
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // USER TRAINING ANALYTICS & ACTIVITY COMPUTATION
  // -------------------------------------------------------------
  const analytics = useMemo(() => {
    const totalSessions = workouts.length;
    const totalSets = workouts.reduce((sum, w) => sum + w.sets, 0);
    const totalReps = workouts.reduce((sum, w) => sum + w.sets * w.reps, 0);
    const totalVolumeKg = workouts.reduce(
      (sum, w) => sum + w.sets * w.reps * (w.weight || 0),
      0
    );
    const maxWeight = workouts.reduce((max, w) => Math.max(max, w.weight || 0), 0);
    const avgRir =
      totalSessions > 0
        ? workouts.reduce((sum, w) => sum + w.rir, 0) / totalSessions
        : 0;

    // Distinct workout dates
    const uniqueDays = Array.from(new Set(workouts.map((w) => w.date))).sort();

    // Unique exercises
    const uniqueExercises = Array.from(
      new Set(workouts.map((w) => w.exercise_name.toLowerCase()))
    ).length;

    // Active profiles
    const distinctProfiles = Array.from(
      new Set(workouts.map((w) => w.profile).filter((p): p is string => Boolean(p)))
    ).length;

    return {
      totalSessions,
      totalSets,
      totalReps,
      totalVolumeKg: Math.round(totalVolumeKg),
      totalVolumeTonnes: (totalVolumeKg / 1000).toFixed(1),
      maxWeight,
      avgRir: Math.round(avgRir * 10) / 10,
      activeDaysCount: uniqueDays.length,
      uniqueExercises,
      distinctProfiles,
      firstSession: uniqueDays[0] || profile.memberSince,
      latestSession: uniqueDays[uniqueDays.length - 1] || null,
    };
  }, [workouts, profile.memberSince]);

  // -------------------------------------------------------------
  // 35-DAY ACTIVITY HEATMAP / CONSISTENCY GRID
  // -------------------------------------------------------------
  const activityDays = useMemo(() => {
    const workoutCountsByDate = new Map<string, number>();
    workouts.forEach((w) => {
      workoutCountsByDate.set(w.date, (workoutCountsByDate.get(w.date) || 0) + 1);
    });

    const days = [];
    const today = new Date();

    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = workoutCountsByDate.get(dateStr) || 0;
      days.push({
        date: dateStr,
        count,
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      });
    }

    return days;
  }, [workouts]);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfileData = {
      ...profile,
      username: usernameInput.trim() || 'IronAthlete',
      email: emailInput.trim() || 'athlete@ironpulse.local',
      bio: bioInput.trim(),
    };

    setProfile(updated);
    localStorage.setItem('ironpulse_user_profile', JSON.stringify(updated));
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const updated: UserProfileData = {
        ...profile,
        avatarUrl: base64Url,
      };
      setProfile(updated);
      localStorage.setItem('ironpulse_user_profile', JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    const updated: UserProfileData = {
      ...profile,
      avatarUrl: null,
    };
    setProfile(updated);
    localStorage.setItem('ironpulse_user_profile', JSON.stringify(updated));
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    // Skeleton success simulation
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3500);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(workouts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironpulse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[85vh] max-w-4xl mx-auto px-4 py-8 select-none animate-slide-up space-y-12 font-sans">
      {/* Top Profile Banner & Avatar */}
      <div className="bg-[#252320]/90 border border-[#383530] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#CC6543]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Avatar with Upload Badge */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#CC6543] bg-[#191816] flex items-center justify-center shadow-lg shadow-[#CC6543]/20">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl sm:text-4xl font-bold text-[#CC6543]">
                {profile.username.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
            title="Upload profile picture"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F2EB]">
                {profile.username}
              </h1>
              <p className="text-xs text-[#A8A297] mt-0.5">{profile.email}</p>
            </div>

            {profile.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs text-[#706B62] hover:text-[#D45B5B] inline-flex items-center gap-1 self-center sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          {profile.bio && (
            <p className="text-xs sm:text-sm text-[#C8C2B7] italic pt-1">
              "{profile.bio}"
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-[#A8A297]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#191816] border border-[#383530]">
              <Calendar className="w-3.5 h-3.5 text-[#CC6543]" />
              Member since {formatSpelledDate(profile.memberSince)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#191816] border border-[#383530]">
              <Flame className="w-3.5 h-3.5 text-[#DE7C5A]" />
              {analytics.activeDaysCount} training days logged
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: GENERAL PROGRESS OVERVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#383530]/60 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#CC6543]" />
            <h2 className="text-lg font-bold text-[#F5F2EB] uppercase tracking-wider">
              General Progress & Lifetime Stats
            </h2>
          </div>
          <span className="text-xs text-[#A8A297]">
            {analytics.totalSessions} Total Sessions
          </span>
        </div>

        {/* 4-Card Analytics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#A8A297] font-semibold block">
              Lifetime Volume
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#F5F2EB] block">
              {analytics.totalVolumeKg >= 1000 ? `${analytics.totalVolumeTonnes} t` : `${analytics.totalVolumeKg} kg`}
            </span>
            <span className="text-[10px] text-[#706B62] block">
              {analytics.totalVolumeKg.toLocaleString()} total kg
            </span>
          </div>

          <div className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#A8A297] font-semibold block">
              Peak Weight Lifted
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#DE7C5A] block">
              {analytics.maxWeight} kg
            </span>
            <span className="text-[10px] text-[#706B62] block">
              All-time heaviest load
            </span>
          </div>

          <div className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#A8A297] font-semibold block">
              Total Volume Reps
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#F5F2EB] block">
              {analytics.totalReps.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#706B62] block">
              Across {analytics.totalSets} completed sets
            </span>
          </div>

          <div className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-[#A8A297] font-semibold block">
              Avg Effort (RIR)
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#F5F2EB] block">
              {analytics.avgRir}
            </span>
            <span className="text-[10px] text-[#706B62] block">
              {analytics.uniqueExercises} unique exercises
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: 35-DAY RECENT ACTIVITY GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#383530]/60 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#CC6543]" />
            <h2 className="text-lg font-bold text-[#F5F2EB] uppercase tracking-wider">
              Recent Training Activity (Last 5 Weeks)
            </h2>
          </div>
          <span className="text-xs text-[#A8A297]">
            {analytics.activeDaysCount} active days
          </span>
        </div>

        <div className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center">
            {activityDays.map((day) => {
              const hasActivity = day.count > 0;
              return (
                <div
                  key={day.date}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    hasActivity
                      ? 'bg-[#CC6543]/20 border-[#CC6543] text-white shadow-sm shadow-[#CC6543]/20'
                      : 'bg-[#191816] border-[#383530]/60 text-[#706B62]'
                  }`}
                  title={`${day.date}: ${day.count} workout${day.count === 1 ? '' : 's'}`}
                >
                  <span className="text-[10px] font-bold opacity-75">{day.dayOfWeek}</span>
                  <span className="text-xs font-bold mt-0.5">{day.date.split('-')[2]}</span>
                  {hasActivity && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CC6543] mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#A8A297] pt-2 border-t border-[#383530]">
            <span>35 days ago</span>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded bg-[#191816] border border-[#383530]" />
              <span>Rest Day</span>
              <span className="inline-block w-2.5 h-2.5 rounded bg-[#CC6543]" />
              <span>Trained</span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: ACCOUNT & PROFILE SETTINGS SKELETON */}
      <div className="space-y-4">
        <div className="border-b border-[#383530]/60 pb-3">
          <h2 className="text-lg font-bold text-[#F5F2EB] uppercase tracking-wider">
            Account Settings
          </h2>
          <p className="text-xs text-[#A8A297] mt-0.5">
            Manage your username, email address, and personal bio.
          </p>
        </div>

        {profileSuccess && (
          <div className="p-3.5 rounded-xl bg-[#789D74]/15 border border-[#789D74]/30 text-[#B8D4B5] text-xs flex items-center gap-2 animate-pop-in">
            <Check className="w-4 h-4 text-[#789D74]" />
            <span>Profile information saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#A8A297] font-medium">
                Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-4 py-2.5 text-sm font-bold text-[#F5F2EB] focus:outline-none transition-colors"
                placeholder="Enter username"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#A8A297] font-medium">
                Email Address
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-4 py-2.5 text-sm font-bold text-[#F5F2EB] focus:outline-none transition-colors"
                placeholder="Enter email"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest text-[#A8A297] font-medium">
              Bio / Motto
            </label>
            <input
              type="text"
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-4 py-2.5 text-sm text-[#F5F2EB] focus:outline-none transition-colors"
              placeholder="e.g. Consistency over intensity"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] text-white text-xs font-semibold uppercase tracking-wider shadow-md shadow-[#CC6543]/20 active:scale-95 transition"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: SECURITY & PASSWORD SKELETON */}
      <div className="space-y-4">
        <div className="border-b border-[#383530]/60 pb-3">
          <h2 className="text-lg font-bold text-[#F5F2EB] uppercase tracking-wider">
            Security & Password
          </h2>
          <p className="text-xs text-[#A8A297] mt-0.5">
            Update your account password for security.
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-[#789D74]/15 border border-[#789D74]/30 text-[#B8D4B5] text-xs flex items-center gap-2 animate-pop-in">
            <Check className="w-4 h-4 text-[#789D74]" />
            <span>Password updated successfully.</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-[#D45B5B]/15 border border-[#D45B5B]/30 text-[#F5B5B5] text-xs animate-pop-in">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#A8A297] font-medium">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-4 py-2 text-sm text-[#F5F2EB] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#A8A297] font-medium">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-4 py-2 text-sm text-[#F5F2EB] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#A8A297] font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-4 py-2 text-sm text-[#F5F2EB] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#383530] hover:bg-[#4D4740] text-white text-xs font-semibold uppercase tracking-wider active:scale-95 transition"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 5: DATA EXPORT & BACKUP */}
      <div className="space-y-4">
        <div className="border-b border-[#383530]/60 pb-3">
          <h2 className="text-lg font-bold text-[#F5F2EB] uppercase tracking-wider">
            Data & Backup
          </h2>
          <p className="text-xs text-[#A8A297] mt-0.5">
            Export a full JSON backup of all your recorded exercises and workout logs.
          </p>
        </div>

        <div className="bg-[#252320]/80 border border-[#383530] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#789D74]/15 text-[#789D74] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#F5F2EB] block">
                Local-First Dataset
              </span>
              <span className="text-xs text-[#A8A297] block">
                {workouts.length} total entries stored locally in IndexedDB.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#252320] border border-[#383530] hover:border-[#CC6543] text-xs font-semibold text-[#F5F2EB] hover:text-white transition active:scale-95"
          >
            <Download className="w-4 h-4 text-[#CC6543]" />
            <span>Export Data Backup (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
