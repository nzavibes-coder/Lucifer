/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Trophy, 
  MessageSquare, 
  Settings, 
  Star, 
  Send, 
  Plus,
  User as UserIcon,
  X,
  ChevronRight,
  Search,
  CheckCircle2,
  LogIn,
  LogOut,
  Gamepad2,
  AlertTriangle,
  Megaphone,
  BookOpen,
  Trash2
} from 'lucide-react';
import { useBloxStore } from './store';
import { Role, TitleBadge, User, Post, Message, Report, Announcement, Mission } from './types';
import { loginWithGoogle, logout } from './firebase';
import { usePWAInstall } from './usePWAInstall';
import { Download } from 'lucide-react';

// --- Sub-components ---

function VideoEmbed({ content }: { content: string }) {
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/|tiktok\.com\/t\/|tiktok\.com\/v\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/)(\d+)/;

  const ytMatch = content.match(youtubeRegex);
  const ttMatch = content.match(tiktokRegex);

  if (ytMatch) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 aspect-video bg-black shadow-2xl">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (ttMatch) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 aspect-[9/16] max-w-[320px] bg-black shadow-2xl mx-auto lg:mx-0">
        <iframe
          className="w-full h-full"
          src={`https://www.tiktok.com/embed/v2/${ttMatch[1]}`}
          title="TikTok video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return null;
}

function Badge({ badge, rating }: { badge: TitleBadge; rating?: number }) {
  const colors = {
    Trusted: 'text-emerald-400',
    Raider: 'text-red-400',
    Helper: 'text-blue-400',
  };
  
  return (
    <div className="flex items-center gap-2">
      {badge && badge !== 'None' && (
        <span className={`text-[10px] font-bold uppercase tracking-widest ${colors[badge as keyof typeof colors]}`}>
          {badge}
        </span>
      )}
      {rating !== undefined && rating >= 4.5 && (
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
          Legendary Pirate
        </span>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const colors = {
    'Senior Moderator': 'text-purple-400',
    'Moderator': 'text-indigo-400',
    'Junior Moderator': 'text-sky-400',
    'Regular User': 'text-slate-500',
  };
  return (
    <span className={`text-[10px] font-medium uppercase tracking-tighter ${colors[role as keyof typeof colors]}`}>
      {role}
    </span>
  );
}

function DailyMissions({ missions }: { missions: Mission[] }) {
  const defaultMissions = [
    { id: 'post-feed', title: 'Post in the community feed', target: 1, current: 0 },
    { id: 'rate-user', title: 'Rate 3 pirates', target: 3, current: 0 },
    { id: 'chat-msg', title: 'Send 5 chat messages', target: 5, current: 0 },
  ];

  const displayMissions = defaultMissions.map(def => {
    const existing = missions.find(m => m.id === def.id);
    return existing || { ...def, completed: false };
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
          <Trophy size={14} />
          Daily Missions
        </h3>
        <span className="text-[10px] text-slate-500 font-bold">Resets Daily</span>
      </div>
      
      <div className="flex flex-col gap-5">
        {displayMissions.map(mission => (
          <div key={mission.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${mission.completed ? 'text-emerald-400' : 'text-slate-300'}`}>
                {mission.title}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-slate-500">
                {mission.current} / {mission.target}
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}
                className={`h-full ${mission.completed ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { 
    users, 
    posts, 
    messages, 
    publicChats,
    reports,
    announcements,
    groups,
    groupMembers,
    groupRequests,
    groupMessages,
    missions,
    selectedGroupId,
    currentUser, 
    loading,
    setSelectedGroupId,
    addUser, 
    updateUser, 
    addPost, 
    deletePost, 
    reactToPost,
    sendPublicMessage,
    sendMessage, 
    createReport,
    deleteReport,
    addAnnouncement,
    deleteAnnouncement,
    rateUser,
    createGroup,
    joinGroupRequest,
    acceptRequest,
    rejectRequest,
    kickMember,
    muteUser,
    unbanUser,
    sendGroupMessage
  } = useBloxStore();

  const { isInstallable, install } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard' | 'mod' | 'inbox' | 'chat' | 'rules' | 'groups'>('feed');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);

  // Form States
  const [adminUsername, setAdminUsername] = useState('');
  const [adminRole, setAdminRole] = useState<Role>('Regular User');
  const [adminBadge, setAdminBadge] = useState<TitleBadge>('None');
  const [newPostContent, setNewPostContent] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [inboxSearch, setInboxSearch] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Refs for auto-scroll
  const publicChatEndRef = useRef<HTMLDivElement>(null);
  const dmChatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom(publicChatEndRef);
  }, [publicChats, activeTab]);

  useEffect(() => {
    if (activeTab === 'inbox' && activeDmId) scrollToBottom(dmChatEndRef);
  }, [messages, activeTab, activeDmId]);

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    // Handle Firestore timestamp vs JS timestamp
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAccountAge = (joinDate: string) => {
    const join = new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - join.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days old`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} months old`;
    return `${Math.floor(diffMonths / 12)} years old`;
  };

  const isMuted = currentUser?.mutedUntil && currentUser.mutedUntil > Date.now();

  const selectedUser = users.find(u => u.id === selectedProfileId);
  const isModOrHigher = currentUser?.role === 'Moderator' || currentUser?.role === 'Senior Moderator';
  const isSrMod = currentUser?.role === 'Senior Moderator';
  const isOwner = currentUser?.email === 'na444715@gmail.com';

  const handleApplyChanges = () => {
    if (!adminUsername) return;
    addUser(adminUsername, adminRole, adminBadge);
    setAdminUsername('');
    setAdminRole('Regular User');
    setAdminBadge('None');
    setIsAdminPanelOpen(false);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    addPost(newPostContent);
    setNewPostContent('');
  };

  const handleSendPublicChat = () => {
    if (!chatInput.trim()) return;
    sendPublicMessage(chatInput);
    setChatInput('');
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeDmId) return;
    sendMessage(activeDmId, chatInput);
    setChatInput('');
  };

  const filteredInboxUsers = users.filter(u => 
    u.id !== currentUser?.id && 
    u.username.toLowerCase().includes(inboxSearch.toLowerCase())
  );

  const dmConversations = useMemo(() => {
    if (!activeDmId || !currentUser) return [];
    return messages.filter(m => 
      (m.fromId === currentUser.id && m.toId === activeDmId) ||
      (m.fromId === activeDmId && m.toId === currentUser.id)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, currentUser, activeDmId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Initializing Blox Hub</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img 
            src="/src/assets/images/blox_hub_hero_1791362699199.jpg" 
            alt="Hero" 
            className="w-full h-full object-cover opacity-20 scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
            <Gamepad2 size={40} className="text-white" />
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-4">Blox Hub</h1>
          <p className="text-slate-400 mb-12 leading-relaxed">The ultimate destination for the legendary pirates. Connect, trade, and dominate the seas.</p>
          
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)] group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            Join with Google
          </button>
          
          <p className="mt-8 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Authenticated with Google Cloud Identity</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[1440px] mx-auto relative">
      {/* Background Image with Scrim */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src="/src/assets/images/blox_hub_hero_1791362699199.jpg" 
          alt="Hero" 
          className="w-full h-full object-cover opacity-10"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 via-[#050505]/90 to-[#050505]" />
      </div>

      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tighter text-white uppercase italic cursor-pointer" onClick={() => setActiveTab('leaderboard')}>Blox Hub</h1>
          {isInstallable && (
            <button 
              onClick={install}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors border border-emerald-500/20 text-emerald-400"
            >
              <Download size={14} />
              Install App
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/10"
            >
              <Settings size={14} />
              Owner Tools
            </button>
          )}
        </div>

        <nav className="flex items-center gap-8">
          <button onClick={() => setActiveTab('feed')} className={`text-sm font-medium transition-colors ${activeTab === 'feed' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Feed</button>
          <button onClick={() => setActiveTab('mod')} className={`text-sm font-medium transition-colors ${activeTab === 'mod' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Staff</button>
          <button onClick={() => setActiveTab('leaderboard')} className={`text-sm font-medium transition-colors ${activeTab === 'leaderboard' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Leaderboard</button>
          <button onClick={() => setActiveTab('chat')} className={`text-sm font-medium transition-colors ${activeTab === 'chat' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Public Chat</button>
          <button onClick={() => setActiveTab('groups')} className={`text-sm font-medium transition-colors ${activeTab === 'groups' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Crews</button>
          <button onClick={() => setActiveTab('inbox')} className={`text-sm font-medium transition-colors ${activeTab === 'inbox' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Inbox</button>
          <button onClick={() => setActiveTab('rules')} className={`text-sm font-medium transition-colors ${activeTab === 'rules' ? 'text-white' : 'text-slate-500 hover:text-white'}`}>Rules</button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              {currentUser.isBanned && <span className="text-[10px] bg-red-500 text-white px-1 rounded font-bold">BANNED</span>}
              {isMuted && <span className="text-[10px] bg-amber-500 text-white px-1 rounded font-bold">MUTED</span>}
              <span className="text-sm font-bold text-white">{currentUser.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge badge={currentUser.badge} rating={currentUser.rating} />
              <RoleBadge role={currentUser.role} />
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} className="text-slate-400" />
          </button>
        </div>
      </header>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[80px] left-0 right-0 z-40 bg-[#0a0a0a] border-b border-white/5 p-8 shadow-2xl"
          >
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield size={20} className="text-white" />
                  Owner Management
                </h2>
                <button onClick={() => setIsAdminPanelOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500">Post Announcement</label>
                  <input 
                    type="text" 
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    placeholder="Global message..."
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      if (announcementInput.trim()) {
                        addAnnouncement(announcementInput);
                        setAnnouncementInput('');
                      }
                    }}
                    className="w-full bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Megaphone size={14} />
                    Announce
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500">Edit Your Name</label>
                  <input 
                    type="text" 
                    value={currentUser.username}
                    onChange={(e) => updateUser(currentUser.id, { username: e.target.value })}
                    className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/40 transition-colors font-bold"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => setIsAdminPanelOpen(false)}
                    className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 px-8 py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'feed' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              {/* Post Timeline */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Announcements Banner */}
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-4 group relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Megaphone size={18} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Global Announcement</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-slate-500">{formatTimestamp(ann.timestamp)}</span>
                          {isSrMod && (
                            <button 
                              onClick={() => deleteAnnouncement(ann.id)}
                              className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-white font-medium">{ann.content}</p>
                    </div>
                  </div>
                ))}

                {isSrMod && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex items-center gap-4">
                    <Megaphone size={16} className="text-indigo-400" />
                    <input 
                      type="text"
                      value={announcementInput}
                      onChange={(e) => setAnnouncementInput(e.target.value)}
                      placeholder="Post a global announcement..."
                      className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && announcementInput.trim()) {
                          addAnnouncement(announcementInput);
                          setAnnouncementInput('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (announcementInput.trim()) {
                          addAnnouncement(announcementInput);
                          setAnnouncementInput('');
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300"
                    >
                      Post News
                    </button>
                  </div>
                )}

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative overflow-hidden">
                  {currentUser.isBanned || isMuted ? (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Shield size={32} className="text-red-500" />
                        <span className="text-red-500 font-bold uppercase tracking-widest text-sm">
                          {currentUser.isBanned ? 'Post Permissions Revoked (Banned)' : 'Frequency Blocked (Muted)'}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Post a Shoutout</h3>
                  <textarea 
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What's happening in the islands?"
                    className="w-full bg-transparent border-none resize-none focus:outline-none text-lg text-white mb-4 h-24"
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[10px] text-slate-500">Community shoutouts and announcements.</span>
                    <button 
                      onClick={handleCreatePost}
                      className="px-6 py-2 bg-white text-black font-bold text-xs uppercase rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Publish Post
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {posts.map(post => {
                    const user = users.find(u => u.id === post.userId);
                    return (
                      <div key={post.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center cursor-pointer"
                              onClick={() => setSelectedProfileId(user?.id || null)}
                            >
                              <UserIcon size={20} className="text-slate-400" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-bold text-white cursor-pointer hover:underline"
                                  onClick={() => setSelectedProfileId(user?.id || null)}
                                >
                                  {user?.username}
                                </span>
                                <Badge badge={user?.badge || 'None'} rating={user?.rating} />
                              </div>
                              <RoleBadge role={user?.role || 'Regular User'} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500">{formatTimestamp(post.timestamp)}</span>
                            {(isModOrHigher || post.userId === currentUser.id) && (
                              <button 
                                onClick={() => deletePost(post.id)}
                                className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        <VideoEmbed content={post.content} />
                        
                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2">
                          {[
                            { emoji: '🔥', label: 'Fire' },
                            { emoji: '👍', label: 'Up' },
                            { emoji: '⚓', label: 'Anchor' }
                          ].map(({ emoji, label }) => {
                            const reactors = post.reactions?.[emoji] || [];
                            const hasReacted = reactors.includes(currentUser.id);
                            return (
                              <button
                                key={label}
                                onClick={() => reactToPost(post.id, emoji)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${hasReacted ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'}`}
                              >
                                <span className="text-sm">{emoji}</span>
                                {reactors.length > 0 && <span className="text-[10px] font-bold tabular-nums">{reactors.length}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side Chat / News */}
              <div className="hidden lg:flex flex-col gap-6">
                <DailyMissions missions={missions} />

                {isInstallable && (
                  <button 
                    onClick={install}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col gap-3 group hover:bg-emerald-500/20 transition-all"
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <Download size={14} className="group-hover:bounce" />
                        Download App
                      </h3>
                      <ChevronRight size={14} className="text-emerald-500/50 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[10px] text-emerald-500/70 text-left font-medium leading-relaxed">
                      Install Blox Hub to your home screen for instant frequency access and better trading.
                    </p>
                  </button>
                )}
                
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-white/5 bg-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                      Live Chat
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {publicChats.slice(-20).map(msg => (
                      <div key={msg.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white">{msg.username}</span>
                          <Badge badge={msg.badge} rating={users.find(u => u.username === msg.username)?.rating} />
                        </div>
                        <p className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg inline-block self-start">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-white/5 bg-black/20">
                    {currentUser.isBanned || isMuted ? (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">
                          {currentUser.isBanned ? 'Banned' : 'Muted'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendPublicChat()}
                          placeholder="Type here..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        />
                        <button 
                          onClick={handleSendPublicChat}
                          className="p-2 bg-white text-black rounded-lg"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <Trophy className="text-amber-400" />
                    Top Community Members
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Global ranking based on community rating and staff activity.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="px-8 py-6 font-medium">Rank</th>
                      <th className="px-8 py-6 font-medium">User</th>
                      <th className="px-8 py-6 font-medium text-center">Staff Role</th>
                      <th className="px-8 py-6 font-medium text-center">Title Badge</th>
                      <th className="px-8 py-6 font-medium text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.sort((a, b) => b.rating - a.rating).map((user, idx) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6">
                          <span className={`text-lg font-mono tabular-nums ${idx < 3 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative">
                              <UserIcon size={14} />
                              {user.isBanned && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#050505] flex items-center justify-center">
                                  <X size={8} className="text-white" strokeWidth={4} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span 
                                className="font-bold text-white cursor-pointer hover:underline flex items-center gap-2"
                                onClick={() => setSelectedProfileId(user.id)}
                              >
                                {user.username}
                                {user.isBanned && <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/30 font-bold">BANNED</span>}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-8 py-6 text-center">
                          <Badge badge={user.badge} rating={user.rating} />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-lg font-mono tabular-nums text-emerald-400">{user.rating.toFixed(1)}</span>
                            <Star size={12} className="text-emerald-400 fill-emerald-400" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'groups' && (
            <motion.div 
              key="groups"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white uppercase italic">
                    <Users className="text-emerald-400" />
                    Island Crews
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Form alliances, chat privately, and dominate the seas together.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Find a crew..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/30 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setIsCreatingGroup(true)}
                    className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shrink-0 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Form Crew
                  </button>
                </div>
              </div>

              {isCreatingGroup && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 max-w-2xl mx-auto w-full"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Form New Crew</h3>
                    <button onClick={() => setIsCreatingGroup(false)} className="text-slate-500 hover:text-white"><X /></button>
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Crew Name</label>
                      <input 
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g. Straw Hat Pirates"
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Description</label>
                      <textarea 
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        placeholder="What is your crew's goal?"
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-all min-h-[100px] resize-none"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (newGroupName.trim()) {
                          await createGroup(newGroupName, newGroupDesc);
                          setNewGroupName('');
                          setNewGroupDesc('');
                          setIsCreatingGroup(false);
                        }
                      }}
                      className="w-full bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-600 transition-all"
                    >
                      Establish Crew
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Groups List */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  {groups
                    .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
                    .map(group => {
                      const isMember = groupMembers.some(m => m.id === currentUser.id && selectedGroupId === group.id);
                      // Note: groupMembers state is only for the selected group. 
                      // To check membership for all groups effectively, we might need a better way, 
                      // but for this UI, we'll just show Join/View.
                      return (
                        <div 
                          key={group.id} 
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`p-6 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-3 ${selectedGroupId === group.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-white text-lg">{group.name}</h4>
                            {group.leaderId === currentUser.id && (
                              <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded font-black uppercase">Your Crew</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{group.description}</p>
                        </div>
                      );
                    })}
                </div>

                {/* Selected Group View */}
                <div className="lg:col-span-2">
                  {selectedGroupId ? (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[700px]">
                        {/* Group Header */}
                        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                          <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-white uppercase italic">{groups.find(g => g.id === selectedGroupId)?.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">{groupMembers.length} Members</span>
                              <div className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="text-xs text-slate-500">Leader: {groupMembers.find(m => m.role === 'Leader')?.username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!groupMembers.some(m => m.id === currentUser.id) && (
                              <button 
                                onClick={() => joinGroupRequest(selectedGroupId)}
                                className="bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                              >
                                Join Crew
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Group Content Tabs */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex-1 flex overflow-hidden">
                            {/* Group Members List */}
                            <div className="w-64 border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-4 bg-black/20">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Crew Members</span>
                              {groupMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between group/member">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                      <UserIcon size={14} className="text-slate-500" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                      <span className="text-xs font-bold text-white truncate">{member.username}</span>
                                      <span className={`text-[9px] uppercase font-bold ${member.role === 'Leader' ? 'text-emerald-400' : 'text-slate-500'}`}>{member.role}</span>
                                    </div>
                                  </div>
                                  {groupMembers.find(m => m.id === currentUser.id)?.role === 'Leader' && member.id !== currentUser.id && (
                                    <button 
                                      onClick={() => kickMember(selectedGroupId, member.id)}
                                      className="text-slate-600 hover:text-red-500 opacity-0 group-hover/member:opacity-100 transition-all"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {/* Join Requests (Leader only) */}
                              {groupMembers.find(m => m.id === currentUser.id)?.role === 'Leader' && groupRequests.length > 0 && (
                                <>
                                  <div className="h-px bg-white/10 my-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Join Requests</span>
                                  {groupRequests.map(req => (
                                    <div key={req.id} className="flex flex-col gap-2 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                      <span className="text-xs font-bold text-white">{req.username}</span>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => acceptRequest(selectedGroupId, req.id, req.username)}
                                          className="flex-1 bg-emerald-500 text-white text-[9px] font-black uppercase py-1.5 rounded"
                                        >
                                          Accept
                                        </button>
                                        <button 
                                          onClick={() => rejectRequest(selectedGroupId, req.id)}
                                          className="px-3 bg-white/5 text-slate-500 text-[9px] font-black uppercase py-1.5 rounded"
                                        >
                                          No
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>

                            {/* Group Chat */}
                            <div className="flex-1 flex flex-col relative bg-[#050505]/50">
                              {!groupMembers.some(m => m.id === currentUser.id) ? (
                                <div className="absolute inset-0 z-10 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-8 text-center gap-4">
                                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Shield size={32} className="text-slate-600" />
                                  </div>
                                  <h4 className="text-lg font-bold text-white uppercase italic tracking-tighter">Classified Crew Frequency</h4>
                                  <p className="text-xs text-slate-500 max-w-xs">You must be a member of this crew to access internal communications.</p>
                                </div>
                              ) : null}
                              
                              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                                {groupMessages.map(msg => (
                                  <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.userId === currentUser.id ? 'self-end items-end' : 'self-start items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold text-slate-500">{msg.username}</span>
                                      <span className="text-[9px] text-slate-700">{formatTimestamp(msg.timestamp)}</span>
                                    </div>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.userId === currentUser.id ? 'bg-emerald-500 text-white font-medium shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/10 text-slate-300'}`}>
                                      {msg.content}
                                    </div>
                                  </div>
                                ))}
                                <div ref={dmChatEndRef} />
                              </div>

                              <div className="p-6 border-t border-white/10 bg-[#080808]">
                                <div className="flex items-center gap-4">
                                  <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && chatInput.trim()) {
                                        sendGroupMessage(selectedGroupId, chatInput);
                                        setChatInput('');
                                      }
                                    }}
                                    placeholder="Communicate with crew..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-emerald-500/20 transition-all text-white"
                                  />
                                  <button 
                                    onClick={() => {
                                      if (chatInput.trim()) {
                                        sendGroupMessage(selectedGroupId, chatInput);
                                        setChatInput('');
                                      }
                                    }}
                                    className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all"
                                  >
                                    <Send size={20} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[700px] bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center text-center gap-6 p-8 border-dashed opacity-50">
                      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Users size={40} className="text-slate-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white uppercase italic tracking-tighter">No Crew Selected</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">Select a crew from the directory to view members and access the frequency.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'mod' && (
            <motion.div 
              key="mod"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-10"
            >
              {/* Reports Section (Mods Only) */}
              {isModOrHigher && reports.length > 0 && (
                <div className="flex flex-col gap-6">
                  <h2 className="text-xl font-bold flex items-center gap-3 text-red-500">
                    <AlertTriangle />
                    Pending Reports
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map(report => {
                      const reported = users.find(u => u.id === report.reportedId);
                      const reporter = users.find(u => u.id === report.reporterId);
                      return (
                        <div key={report.id} className="bg-red-500/5 border border-red-500/10 rounded-xl p-6 flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold text-red-400">Target Pirate</span>
                              <span className="font-black text-lg text-white">{reported?.username || 'Unknown'}</span>
                            </div>
                            <button 
                              onClick={() => deleteReport(report.id)}
                              className="text-slate-500 hover:text-white p-2"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Reason for report</span>
                            <p className="text-sm text-slate-300 italic">"{report.reason}"</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-slate-600">Filed by</span>
                              <span className="text-xs text-slate-400">{reporter?.username || 'System'}</span>
                            </div>
                            <button 
                              onClick={() => {
                                if (reported) {
                                  updateUser(reported.id, { isBanned: true });
                                  deleteReport(report.id);
                                }
                              }}
                              className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
                            >
                              Confirm Ban
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                      <Shield className="text-indigo-400" />
                      Staff Directory
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Our dedicated team of moderators keeping the community safe.</p>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search name or role..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {users
                    .filter(u => u.role !== 'Regular User')
                    .filter(u => 
                      u.username.toLowerCase().includes(staffSearch.toLowerCase()) || 
                      u.role.toLowerCase().includes(staffSearch.toLowerCase())
                    )
                    .map(user => (
                    <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center relative">
                            <UserIcon size={24} className="text-slate-400" />
                            {user.isBanned && (
                              <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full border-4 border-[#050505]">
                                <X size={12} strokeWidth={4} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-white flex items-center gap-2">
                              {user.username}
                              {user.isBanned && <span className="text-[10px] text-red-500 font-black uppercase">Banned</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge badge={user.badge} rating={user.rating} />
                              <RoleBadge role={user.role} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-[10px] uppercase text-slate-500 block mb-1">Join Date</span>
                          <span className="text-sm font-medium">{user.joinDate}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-[10px] uppercase text-slate-500 block mb-1">Community Rep</span>
                          <span className="text-sm font-medium">{user.ratingCount} Votes</span>
                        </div>
                      </div>

                      {isModOrHigher && user.id !== currentUser.id && (
                        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Staff Actions</span>
                          <div className="flex flex-wrap gap-2">
                            {isOwner && (
                              <button 
                                onClick={() => updateUser(user.id, { role: 'Junior Moderator' })}
                                className="px-3 py-1.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
                              >
                                PROMOTE TO JR MOD
                              </button>
                            )}
                            <button 
                              onClick={() => updateUser(user.id, { badge: 'Trusted' })}
                              className="px-3 py-1.5 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded transition-colors"
                            >
                              GIVE TRUSTED
                            </button>
                            <button 
                              onClick={() => updateUser(user.id, { badge: 'Raider' })}
                              className="px-3 py-1.5 text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded transition-colors"
                            >
                              GIVE RAIDER
                            </button>
                            <button 
                              onClick={() => {
                                if (user.isBanned) unbanUser(user.id);
                                else updateUser(user.id, { isBanned: true });
                              }}
                              className={`px-3 py-1.5 text-[10px] font-bold rounded transition-colors border ${user.isBanned ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                            >
                              {user.isBanned ? 'UNBAN' : 'BAN'}
                            </button>
                            {(isModOrHigher || currentUser.role === 'Junior Moderator') && (
                              <button 
                                onClick={() => muteUser(user.id, 2)}
                                className="px-3 py-1.5 text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded transition-colors"
                              >
                                MUTE (2H)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[700px] max-w-4xl mx-auto"
            >
              <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-3 text-white">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  Live Public Chat
                </h3>
                <span className="text-[10px] font-bold text-slate-500">{users.length} PIRATES ONLINE</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {publicChats.map(chat => (
                  <div key={chat.id} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10 transition-colors">
                      <UserIcon size={18} className="text-slate-500" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{chat.username}</span>
                        <Badge badge={chat.badge} rating={users.find(u => u.id === chat.userId)?.rating} />
                        <RoleBadge role={chat.role} />
                        <span className="text-[9px] font-medium text-slate-600 ml-1">{formatTimestamp(chat.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-2xl bg-white/[0.02] px-3 py-2 rounded-lg border border-white/[0.03]">
                        {chat.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={publicChatEndRef} />
              </div>
              <div className="p-6 border-t border-white/10 bg-[#080808]">
                {currentUser.isBanned || isMuted ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <span className="text-xs text-red-500 font-bold uppercase tracking-widest">
                      {currentUser.isBanned ? 'Chat Disabled (Banned)' : 'Muted (2h Penalty)'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendPublicChat()}
                      placeholder="Share a bounty tip..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm focus:outline-none focus:border-white/20 transition-all text-white placeholder:text-slate-600"
                    />
                    <button 
                      onClick={handleSendPublicChat}
                      className="w-14 h-14 bg-white text-black rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all hover:scale-105"
                    >
                      <Send size={24} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'inbox' && (
            <motion.div 
              key="inbox"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex h-[700px]"
            >
              {/* Sidebar */}
              <div className="w-1/3 border-r border-white/10 flex flex-col">
                <div className="p-6 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      placeholder="Search pirates..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 transition-colors text-white"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredInboxUsers.map(user => (
                    <button 
                      key={user.id}
                      onClick={() => setActiveDmId(user.id)}
                      className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-white/5 ${activeDmId === user.id ? 'bg-white/5' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative">
                        <UserIcon size={18} />
                        {user.isBanned && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#050505]" />}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="font-bold text-white truncate">{user.username}</span>
                        <div className="flex items-center gap-2">
                          <Badge badge={user.badge} rating={user.rating} />
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-[#080808]/50 relative">
                {activeDmId ? (
                  <>
                    <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <UserIcon size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{users.find(u => u.id === activeDmId)?.username}</span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Connected</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedProfileId(activeDmId)}
                        className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                      >
                        View Profile
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                      {dmConversations.length > 0 ? dmConversations.map(msg => (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col max-w-[70%] ${msg.fromId === currentUser.id ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                          <div className={`px-4 py-3 rounded-2xl text-sm ${msg.fromId === currentUser.id ? 'bg-white text-black font-medium shadow-xl' : 'bg-white/10 text-white'}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">{formatTimestamp(msg.timestamp)}</span>
                        </div>
                      )) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                          <MessageSquare size={48} className="opacity-20" />
                          <p className="text-sm">No encrypted messages found</p>
                        </div>
                      )}
                      <div ref={dmChatEndRef} />
                    </div>
                    <div className="p-6 border-t border-white/10 bg-white/5">
                      {currentUser.isBanned || isMuted ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                          <span className="text-xs text-red-500 font-bold uppercase tracking-widest">
                            {currentUser.isBanned ? 'Inbox Restricted (Banned)' : 'Muted (Temporary Penalty)'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type an encrypted message..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm focus:outline-none focus:border-white/20 transition-all text-white"
                          />
                          <button 
                            onClick={handleSendMessage}
                            className="w-14 h-14 bg-white text-black rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all"
                          >
                            <Send size={24} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <MessageSquare size={64} className="opacity-10" />
                    <p className="text-lg font-medium opacity-20">Secure pirates communication hub</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'rules' && (
            <motion.div 
              key="rules"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto flex flex-col gap-10"
            >
              <div className="text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen size={32} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2">Community Code of Conduct</h2>
                <p className="text-slate-500 text-sm">Follow these rules or face the Plank (Banned).</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "No Spamming", desc: "Do not flood chat or feed with repetitive messages or nonsense.", icon: <AlertTriangle className="text-amber-400" /> },
                  { title: "No Abuse or Harassment", desc: "Respect all crewmates. Hate speech, bullying, or toxicity is strictly forbidden.", icon: <Shield className="text-indigo-400" /> },
                  { title: "No Scams or Fraud", desc: "Do not attempt to deceive others for fruits, accounts, or real currency.", icon: <AlertTriangle className="text-red-400" /> },
                  { title: "Staff Authority", desc: "Follow moderator instructions immediately. Impersonating staff is a permanent ban.", icon: <CheckCircle2 className="text-emerald-400" /> }
                ].map((rule, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-6 hover:border-white/20 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                      {rule.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{rule.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-8 text-center italic text-slate-500 text-xs">
                "A pirate hub is only as strong as its crew. Keep the seas clean."
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedProfileId && selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setSelectedProfileId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative">
                <button 
                  onClick={() => setSelectedProfileId(null)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-8 pb-8 -mt-12 relative">
                <div className="w-24 h-24 rounded-3xl bg-[#0a0a0a] border-8 border-[#0a0a0a] shadow-2xl mb-4 overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <UserIcon size={40} className="text-white/20" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{selectedUser.username}</h2>
                    <CheckCircle2 size={24} className="text-blue-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge badge={selectedUser.badge} rating={selectedUser.rating} />
                    <RoleBadge role={selectedUser.role} />
                    {selectedUser.isBanned && <span className="text-[10px] font-black text-red-500 uppercase">Banned</span>}
                    {selectedUser.mutedUntil && selectedUser.mutedUntil > Date.now() && <span className="text-[10px] font-black text-amber-500 uppercase">Muted</span>}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-2">{getAccountAge(selectedUser.joinDate)} pirate</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 rounded-2xl p-5 flex flex-col gap-1 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reputation</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono tabular-nums text-white">{selectedUser.rating}</span>
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 flex flex-col gap-1 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Voters</span>
                    <span className="text-2xl font-mono tabular-nums text-white">{selectedUser.ratingCount}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {isReporting ? (
                    <div className="flex flex-col gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Report Pirate for Misconduct</span>
                      <textarea 
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Explain why you are reporting this user (Spam, Abuse, Scam)..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-red-500/40 min-h-[100px] resize-none"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (reportReason.trim()) {
                              createReport(selectedUser.id, reportReason);
                              setIsReporting(false);
                              setReportReason('');
                              setSelectedProfileId(null);
                            }
                          }}
                          className="flex-1 bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-red-600 transition-all"
                        >
                          Confirm Report
                        </button>
                        <button 
                          onClick={() => setIsReporting(false)}
                          className="px-6 bg-white/5 text-slate-400 font-bold text-[10px] uppercase py-3 rounded-xl hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {selectedUser.id === currentUser.id ? 'Your Reputation' : 'Endorse Pirate'}
                        </span>
                        <div className="flex justify-between items-center bg-white/5 rounded-2xl p-5 border border-white/5">
                          <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button 
                                key={star}
                                onClick={() => {
                                  if (selectedUser.id !== currentUser.id) {
                                    rateUser(selectedUser.id, star);
                                  }
                                }}
                                disabled={selectedUser.id === currentUser.id}
                                className={`transition-all ${selectedUser.id !== currentUser.id ? 'hover:text-amber-400 hover:scale-125' : 'cursor-default'} ${star <= Math.round(selectedUser.rating) ? 'text-amber-400' : 'text-slate-700'}`}
                              >
                                <Star size={28} className={star <= Math.round(selectedUser.rating) ? 'fill-amber-400' : ''} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {selectedUser.id !== currentUser.id && (isModOrHigher || currentUser.role === 'Junior Moderator') && (
                        <div className="flex gap-2 w-full">
                          {isModOrHigher && (
                            <button 
                              onClick={() => {
                                if (selectedUser.isBanned) unbanUser(selectedUser.id);
                                else updateUser(selectedUser.id, { isBanned: true });
                              }}
                              className={`flex-1 ${selectedUser.isBanned ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} font-bold text-[10px] uppercase py-3 rounded-xl transition-all`}
                            >
                              {selectedUser.isBanned ? 'Unban Pirate' : 'Ban Pirate'}
                            </button>
                          )}
                          {(!selectedUser.mutedUntil || selectedUser.mutedUntil < Date.now()) && (
                            <button 
                              onClick={() => muteUser(selectedUser.id, 2)}
                              className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[10px] uppercase py-3 rounded-xl hover:bg-amber-500/20 transition-all"
                            >
                              Mute (2h)
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            setActiveDmId(selectedUser.id);
                            setActiveTab('inbox');
                            setSelectedProfileId(null);
                          }}
                          className="flex-1 bg-white text-black font-bold text-sm uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          <MessageSquare size={20} />
                          Send Private
                        </button>
                        {selectedUser.id !== currentUser.id && (
                          <button 
                            onClick={() => setIsReporting(true)}
                            className="w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            title="Report User"
                          >
                            <AlertTriangle size={24} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
