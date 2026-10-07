/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDoc, 
  updateDoc, 
  limit,
  serverTimestamp,
  increment,
  where,
  or
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from './firebase';
import { User, Role, TitleBadge, Post, Message, Report, Announcement, Group, GroupMember, GroupRequest, GroupMessage, Mission } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useBloxStore() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [publicChats, setPublicChats] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const isOwner = user.email === 'na444715@gmail.com';
            const newUser: User = {
              id: user.uid,
              username: user.displayName || 'New Pirate',
              email: user.email || '',
              role: isOwner ? 'Senior Moderator' : 'Regular User',
              badge: 'None',
              rating: 0,
              ratingCount: 0,
              joinDate: new Date().toISOString().split('T')[0],
              isBanned: false,
              mutedUntil: 0,
            };
            await setDoc(userDocRef, newUser);
            setCurrentUser(newUser);
          } else {
            const data = userDoc.data();
            setCurrentUser({
              ...data,
              id: user.uid,
              role: data?.role || 'Regular User',
              badge: data?.badge || 'None',
              isBanned: data?.isBanned || false,
              mutedUntil: data?.mutedUntil || 0,
            } as User);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
  }, []);

  // Users Listener
  useEffect(() => {
    if (!fbUser) return;
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const u = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      setUsers(u);
      const current = u.find(user => user.id === fbUser.uid);
      if (current) setCurrentUser(current);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  }, [fbUser]);

  // Posts Listener
  useEffect(() => {
    if (!fbUser) return;
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  }, [fbUser]);

  // Public Chat Listener
  useEffect(() => {
    if (!fbUser) return;
    const q = query(collection(db, 'public_chat'), orderBy('timestamp', 'asc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      setPublicChats(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'public_chat');
    });
  }, [fbUser]);

  // Messages Listener - FIXED: Filter for current user's messages to satisfy rules
  useEffect(() => {
    if (!fbUser) return;
    const q = query(
      collection(db, 'messages'), 
      or(where('fromId', '==', fbUser.uid), where('toId', '==', fbUser.uid)),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
  }, [fbUser]);

  // Reports Listener (Mods only)
  useEffect(() => {
    if (!fbUser || !currentUser || currentUser.role === 'Regular User') return;
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Report)));
    }, (error) => {
      // It's okay if this fails for non-mods before it triggers
      console.warn("Reports access denied or pending permissions");
    });
  }, [fbUser, currentUser]);

  // Announcements Listener
  useEffect(() => {
    if (!fbUser) return;
    const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(5));
    return onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Announcement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });
  }, [fbUser]);

  // Groups Listener
  useEffect(() => {
    if (!fbUser) return;
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Group)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });
  }, [fbUser]);

  // Selected Group Sub-listeners
  useEffect(() => {
    if (!fbUser || !selectedGroupId) {
      setGroupMembers([]);
      setGroupRequests([]);
      setGroupMessages([]);
      return;
    }

    const membersQ = query(collection(db, 'groups', selectedGroupId, 'members'), orderBy('joinedAt', 'asc'));
    const membersUnsub = onSnapshot(membersQ, (snapshot) => {
      setGroupMembers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GroupMember)));
    }, (error) => {
      console.warn("Group members access denied or group deleted");
    });

    const requestsQ = query(collection(db, 'groups', selectedGroupId, 'requests'), orderBy('timestamp', 'asc'));
    const requestsUnsub = onSnapshot(requestsQ, (snapshot) => {
      setGroupRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GroupRequest)));
    }, (error) => {
      console.warn("Group requests access denied");
    });

    const messagesQ = query(collection(db, 'groups', selectedGroupId, 'messages'), orderBy('timestamp', 'asc'), limit(50));
    const messagesUnsub = onSnapshot(messagesQ, (snapshot) => {
      setGroupMessages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GroupMessage)));
    }, (error) => {
      console.warn("Group messages access denied");
    });

    return () => {
      membersUnsub();
      requestsUnsub();
      messagesUnsub();
    };
  }, [fbUser, selectedGroupId]);

  // Missions Listener
  useEffect(() => {
    if (!fbUser) {
      setMissions([]);
      return;
    }

    const missionsRef = collection(db, 'users', fbUser.uid, 'missions');
    return onSnapshot(missionsRef, (snapshot) => {
      setMissions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Mission)));
    }, (error) => {
      console.warn("Missions access denied");
    });
  }, [fbUser]);

  const addUser = async (username: string, role: Role, badge: TitleBadge) => {
    // Real users are created via Google Login. This could be used for invite logic.
  };

  const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', userId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const addPost = async (content: string) => {
    if (!currentUser) return;
    const filteredContent = wordFilter(content);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: currentUser.id,
        username: currentUser.username,
        content: filteredContent,
        timestamp: serverTimestamp(),
        badge: currentUser.badge,
        role: currentUser.role
      });
      await updateMissionProgress('post-feed', 1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const reactToPost = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    try {
      const pDoc = await getDoc(postRef);
      if (pDoc.exists()) {
        const data = pDoc.data() as Post;
        const reactions = data.reactions || {};
        const currentReactors = reactions[emoji] || [];
        
        let newReactors: string[];
        if (currentReactors.includes(currentUser.id)) {
          newReactors = currentReactors.filter(uid => uid !== currentUser.id);
        } else {
          newReactors = [...currentReactors, currentUser.id];
        }

        await updateDoc(postRef, {
          [`reactions.${emoji}`]: newReactors
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const sendPublicMessage = async (content: string) => {
    if (!currentUser) return;
    const filteredContent = wordFilter(content);
    try {
      await addDoc(collection(db, 'public_chat'), {
        userId: currentUser.id,
        username: currentUser.username,
        content: filteredContent,
        timestamp: serverTimestamp(),
        badge: currentUser.badge,
        role: currentUser.role
      });
      await updateMissionProgress('chat-msg', 1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'public_chat');
    }
  };

  const sendMessage = async (toId: string, content: string) => {
    if (!currentUser) return;
    const filteredContent = wordFilter(content);
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: currentUser.id,
        toId,
        content: filteredContent,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  const createReport = async (reportedId: string, reason: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.id,
        reportedId,
        reason,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${reportId}`);
    }
  };

  const addAnnouncement = async (content: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        content,
        timestamp: serverTimestamp(),
        authorId: currentUser.id
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${announcementId}`);
    }
  };

  const rateUser = async (userId: string, rating: number) => {
    const userRef = doc(db, 'users', userId);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const newCount = (data.ratingCount || 0) + 1;
        const newRating = (((data.rating || 0) * (data.ratingCount || 0)) + rating) / newCount;
        await updateDoc(userRef, {
          rating: Number(newRating.toFixed(1)),
          ratingCount: newCount
        });
        await updateMissionProgress('rate-user', 1);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const createGroup = async (name: string, description: string) => {
    if (!currentUser) return;
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name,
        description,
        leaderId: currentUser.id,
        createdAt: serverTimestamp()
      });
      // Add leader as first member
      await setDoc(doc(db, 'groups', groupRef.id, 'members', currentUser.id), {
        role: 'Leader',
        joinedAt: serverTimestamp(),
        username: currentUser.username
      });
      setSelectedGroupId(groupRef.id);
      return groupRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    }
  };

  const joinGroupRequest = async (groupId: string) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'groups', groupId, 'requests', currentUser.id), {
        userId: currentUser.id,
        username: currentUser.username,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/requests`);
    }
  };

  const acceptRequest = async (groupId: string, userId: string, username: string) => {
    try {
      await setDoc(doc(db, 'groups', groupId, 'members', userId), {
        role: 'Member',
        joinedAt: serverTimestamp(),
        username
      });
      await deleteDoc(doc(db, 'groups', groupId, 'requests', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}/members`);
    }
  };

  const rejectRequest = async (groupId: string, userId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'requests', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}/requests`);
    }
  };

  const kickMember = async (groupId: string, userId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}/members`);
    }
  };

  const muteUser = async (userId: string, hours: number) => {
    try {
      const mutedUntil = Date.now() + (hours * 60 * 60 * 1000);
      await updateDoc(doc(db, 'users', userId), {
        mutedUntil
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const wordFilter = (text: string) => {
    const abuseWords = ['abuse', 'scam', 'spam', 'fuck', 'shit', 'ass', 'bitch']; // Basic list as requested
    let filteredText = text;
    abuseWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredText = filteredText.replace(regex, '***');
    });
    return filteredText;
  };

  const updateMissionProgress = async (missionId: string, incrementVal: number) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const missionRef = doc(db, 'users', currentUser.id, 'missions', missionId);
    
    const MISSION_CONFIG: Record<string, { title: string, target: number }> = {
      'post-feed': { title: 'Post in the community feed', target: 1 },
      'rate-user': { title: 'Rate 3 pirates', target: 3 },
      'chat-msg': { title: 'Send 5 chat messages', target: 5 },
    };

    const config = MISSION_CONFIG[missionId];
    if (!config) return;

    try {
      const mDoc = await getDoc(missionRef);
      let data = mDoc.exists() ? mDoc.data() : null;

      // Reset if old date
      if (!data || data.lastUpdated !== today) {
        data = {
          id: missionId,
          title: config.title,
          target: config.target,
          current: 0,
          completed: false,
          lastUpdated: today
        };
      }

      if (data.completed) return;

      const newCurrent = data.current + incrementVal;
      const completed = newCurrent >= data.target;

      await setDoc(missionRef, {
        ...data,
        current: newCurrent,
        completed,
        lastUpdated: today
      });
    } catch (error) {
      console.warn("Failed to update mission progress", error);
    }
  };

  const sendGroupMessage = async (groupId: string, content: string) => {
    if (!currentUser) return;
    const filteredContent = wordFilter(content);
    try {
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        userId: currentUser.id,
        username: currentUser.username,
        content: filteredContent,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/messages`);
    }
  };

  return {
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
    updateUser: updateUserProfile,
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
    sendGroupMessage,
  };
}
