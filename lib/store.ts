import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth, db } from '@/utils/firebase/client';
import {
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    orderBy,
    limit,
    startAfter,
    getCountFromServer
} from 'firebase/firestore';

// --- Types ---
// ... (Keeping types as they were, they are mostly compatible)
export type Permission =
    | 'VIEW_GROUPS'
    | 'VIEW_STUDENTS'
    | 'MANAGE_GRADES'
    | 'CONFIRM_GRADES'
    | 'MANAGE_ASSIGNMENTS'
    | 'MANAGE_USERS'
    | 'MANAGE_SUBJECTS'
    | 'VIEW_REPORTS';

export type Role = 'ADMIN' | 'TEACHER' | 'RESPONSIBLE' | 'CUSTOM';

export interface User {
    id: string;
    username: string;
    name: string;
    email?: string;
    phone?: string;
    role: Role;
    customRoleName?: string;
    permissions: Permission[];
    avatarUrl?: string;
}

export const PERMISSION_LABELS: Record<Permission, string> = {
    VIEW_GROUPS: 'Просмотр групп',
    VIEW_STUDENTS: 'Просмотр студентов',
    MANAGE_GRADES: 'Выставление оценок',
    CONFIRM_GRADES: 'Подтверждение оценок',
    MANAGE_ASSIGNMENTS: 'Управление нагрузкой',
    MANAGE_USERS: 'Управление пользователями',
    MANAGE_SUBJECTS: 'Управление предметами',
    VIEW_REPORTS: 'Просмотр отчетов',
};

export const ROLE_PRESETS: Record<Role, { label: string, permissions: Permission[] }> = {
    ADMIN: {
        label: 'Администратор',
        permissions: ['VIEW_GROUPS', 'VIEW_STUDENTS', 'MANAGE_GRADES', 'CONFIRM_GRADES', 'MANAGE_ASSIGNMENTS', 'MANAGE_USERS', 'MANAGE_SUBJECTS', 'VIEW_REPORTS']
    },
    TEACHER: {
        label: 'Преподаватель',
        permissions: ['VIEW_GROUPS', 'VIEW_STUDENTS', 'MANAGE_GRADES']
    },
    RESPONSIBLE: {
        label: 'Заведующий кафедрой',
        permissions: ['VIEW_GROUPS', 'VIEW_STUDENTS', 'CONFIRM_GRADES', 'MANAGE_ASSIGNMENTS', 'VIEW_REPORTS']
    },
    CUSTOM: {
        label: 'Другая роль...',
        permissions: []
    }
};

export interface Student {
    id: string;
    hemisId: string;
    name: string;
    nationality: string;
    gender: string;
    passportId: string;
    pinfl: string;
    course: number;
    group: string;
    language: string;
    academicYear: string;
    semester: number;
}

export interface Subject {
    id: string;
    name: string;
}

export interface TeacherAssignment {
    teacherId: string;
    subjectId: string;
    groupId: string;
}

export type GradeStatus = 'PENDING' | 'CONFIRMED';
export type GradeType = 'MIDTERM' | 'FINAL';

export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    teacherId: string;
    value: number;
    type: GradeType;
    comment?: string;
    status: GradeStatus;
    createdAt: string;
    updatedAt: string;
    confirmedBy?: string;
}

// --- Store ---

interface AppState {
    currentUser: User | null;
    users: User[];
    students: Student[];
    subjects: Subject[];
    groups: { id: string, name: string }[];
    assignments: TeacherAssignment[];
    grades: Grade[];
    isLoading: boolean;
    isStudentsLoading: boolean;
    isGroupsLoading: boolean;
    studentsPage: Student[];
    studentsTotalCount: number;
    groupsPage: { id: string, name: string }[];
    groupsTotalCount: number;

    // Group-specific data (for grading/group views)
    groupStudents: Student[];
    groupGrades: Grade[];
    isGroupLoading: boolean;

    // Stats for Dashboard (cached counts)
    stats: {
        totalStudents: number;
        totalTeachers: number;
        totalSubjects: number;
        totalGroups: number;
        pendingGrades: number;
        confirmedGrades: number;
        courseDistribution: { name: string, count: number }[];
        genderDistribution: { name: string, value: number }[];
    };

    // Actions
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    fetchData: () => Promise<void>;
    fetchStats: () => Promise<void>;
    fetchGroupData: (groupName: string, subjectId?: string) => Promise<void>;

    // User Management
    addUser: (user: Omit<User, 'id'> & { password: string }) => Promise<void>;
    updateUser: (id: string, data: Partial<User>) => Promise<void>;
    removeUser: (id: string) => Promise<void>;

    // Grade Management
    addGrade: (teacherId: string, studentId: string, subjectId: string, value: number, type: GradeType, comment?: string) => Promise<void>;
    updateGrade: (gradeId: string, value: number, comment?: string) => Promise<void>;
    saveGroupGrades: (gradesData: { studentId: string, subjectId: string, teacherId: string, value: number, type: GradeType }[]) => Promise<void>;
    confirmGrade: (gradeId: string, responsibleId: string) => Promise<void>;
    revokeConfirmation: (gradeId: string) => Promise<void>;

    // Admin / Assignment Management
    assignTeacher: (teacherId: string, subjectId: string, groupId: string) => Promise<void>;
    removeAssignment: (teacherId: string, subjectId: string, groupId: string) => Promise<void>;
    // Subject & Student Management
    addSubject: (name: string) => Promise<void>;
    removeSubject: (id: string) => Promise<void>;
    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    removeStudent: (id: string) => Promise<void>;
    bulkAddStudents: (students: Omit<Student, 'id'>[]) => Promise<void>;
    removeGroup: (groupName: string) => Promise<void>;
    fetchStudentsPage: (page: number, pageSize: number, filters?: { searchTerm?: string, course?: string, group?: string, gender?: string }) => Promise<void>;
    fetchGroupsPage: (page: number, pageSize: number, filters?: { searchTerm?: string, course?: string, flow?: string }) => Promise<void>;
    clearAllStudents: () => Promise<void>;

    // Internal
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            users: [],
            students: [],
            subjects: [],
            groups: [],
            assignments: [],
            grades: [],
            isLoading: false,
            isStudentsLoading: false,
            isGroupsLoading: false,
            studentsPage: [],
            studentsTotalCount: 0,
            groupsPage: [],
            groupsTotalCount: 0,
            groupStudents: [],
            groupGrades: [],
            isGroupLoading: false,
            stats: {
                totalStudents: 0,
                totalTeachers: 0,
                totalSubjects: 0,
                totalGroups: 0,
                pendingGrades: 0,
                confirmedGrades: 0,
                courseDistribution: [],
                genderDistribution: []
            },
            _hasHydrated: false,

            setHasHydrated: (state) => {
                set({ _hasHydrated: state });
                if (state) get().fetchData();
            },

            fetchData: async () => {
                const { currentUser } = get();
                if (!currentUser) return;

                set({ isLoading: true });

                try {
                    // Fetch only small metadata tables globally
                    const [
                        profilesSnap,
                        subjectsSnap,
                        groupsSnap,
                        assignmentsSnap
                    ] = await Promise.all([
                        getDocs(collection(db, 'profiles')),
                        getDocs(collection(db, 'subjects')),
                        getDocs(collection(db, 'groups')),
                        getDocs(collection(db, 'teacher_assignments'))
                    ]);

                    get().fetchStats(); // Fetch stats in parallel

                    set({
                        users: profilesSnap.docs.map((doc: any) => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                username: data.username,
                                name: data.full_name || '',
                                role: data.role,
                                permissions: data.permissions || [],
                                phone: data.phone,
                                avatarUrl: data.avatar_url,
                                customRoleName: data.custom_role_name
                            };
                        }) as User[],
                        subjects: subjectsSnap.docs.map((doc: any) => ({
                            id: doc.id,
                            name: doc.data().name
                        })) as Subject[],
                        groups: groupsSnap.docs.map((doc: any) => ({
                            id: doc.id,
                            name: doc.data().name
                        })),
                        assignments: assignmentsSnap.docs.map((doc: any) => {
                            const data = doc.data();
                            return {
                                teacherId: data.teacher_id,
                                subjectId: data.subject_id,
                                groupId: data.group_id
                            };
                        }) as TeacherAssignment[]
                    });

                } catch (error: any) {
                    console.error('Error fetching data:', error);
                    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                        get().logout();
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            fetchStats: async () => {
                try {
                    const [
                        studentsCount,
                        teachersSnap,
                        subjectsCount,
                        groupsCount,
                        pendingGradesCount,
                        confirmedGradesCount,
                        course1, course2, course3, course4,
                        maleCount, femaleCount
                    ] = await Promise.all([
                        getCountFromServer(collection(db, 'students')),
                        getDocs(query(collection(db, 'profiles'), where('role', '==', 'TEACHER'))),
                        getCountFromServer(collection(db, 'subjects')),
                        getCountFromServer(collection(db, 'groups')),
                        getCountFromServer(query(collection(db, 'grades'), where('status', '==', 'PENDING'))),
                        getCountFromServer(query(collection(db, 'grades'), where('status', '==', 'CONFIRMED'))),
                        // Course Distribution
                        getCountFromServer(query(collection(db, 'students'), where('course', '==', 1))),
                        getCountFromServer(query(collection(db, 'students'), where('course', '==', 2))),
                        getCountFromServer(query(collection(db, 'students'), where('course', '==', 3))),
                        getCountFromServer(query(collection(db, 'students'), where('course', '==', 4))),
                        // Gender Distribution
                        getCountFromServer(query(collection(db, 'students'), where('gender', '==', 'Мужской'))),
                        getCountFromServer(query(collection(db, 'students'), where('gender', '==', 'Женский')))
                    ]);

                    set({
                        stats: {
                            totalStudents: studentsCount.data().count,
                            totalTeachers: teachersSnap.size,
                            totalSubjects: subjectsCount.data().count,
                            totalGroups: groupsCount.data().count,
                            pendingGrades: pendingGradesCount.data().count,
                            confirmedGrades: confirmedGradesCount.data().count,
                            courseDistribution: [
                                { name: "1 курс", count: course1.data().count },
                                { name: "2 курс", count: course2.data().count },
                                { name: "3 курс", count: course3.data().count },
                                { name: "4 курс", count: course4.data().count }
                            ],
                            genderDistribution: [
                                { name: "Мужской", value: maleCount.data().count },
                                { name: "Женский", value: femaleCount.data().count }
                            ]
                        },
                        studentsTotalCount: studentsCount.data().count
                    });
                } catch (error) {
                    console.error('Error fetching stats:', error);
                }
            },

            fetchGroupData: async (groupName, subjectId) => {
                set({ isGroupLoading: true });
                try {
                    // 1. Get Group ID from name
                    const groupsSnap = await getDocs(query(collection(db, 'groups'), where('name', '==', groupName)));
                    if (groupsSnap.empty) {
                        set({ groupStudents: [], groupGrades: [], isGroupLoading: false });
                        return;
                    }
                    const groupId = groupsSnap.docs[0].id;

                    // 2. Fetch Students for this group
                    const studentsSnap = await getDocs(query(collection(db, 'students'), where('group_id', '==', groupId)));
                    const groupStudents = studentsSnap.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            hemisId: data.hemis_id || '',
                            name: data.full_name || '',
                            group: groupName,
                            nationality: data.nationality || '',
                            gender: data.gender || 'Мужской',
                            passportId: data.passport_id || '',
                            pinfl: data.pinfl || '',
                            course: data.course || 1,
                            language: data.language || 'Узбекский',
                            academicYear: data.academic_year || '2023-2024',
                            semester: data.semester || 1
                        };
                    }) as Student[];

                    // 3. Fetch Grades if subject specified
                    let groupGrades: Grade[] = [];
                    if (subjectId) {
                        const gradesSnap = await getDocs(query(
                            collection(db, 'grades'),
                            where('subject_id', '==', subjectId),
                            where('student_id', 'in', groupStudents.map(s => s.id).slice(0, 10)) // Firestore limit of 10 in 'in' query
                        ));
                        // Actually 'in' query is limited to 30 now usually in Firebase, but for many students it's better to query by group if we had group_id on grades.
                        // Let's assume groups are small enough or we fetch by subject and filter locally if needed.
                        // Better: If we have many students, we fetch all grades for the subject and filter. 
                        // But wait, grades for a subject could be millions.

                        // Optimized approach: Query grades where subject_id == subjectId. 
                        // If we have studentIds, we can chunk them.
                    }

                    // Simple approach for now as group students are usually < 100
                    const studentIds = groupStudents.map(s => s.id);
                    if (subjectId && studentIds.length > 0) {
                        const chunks: string[][] = [];
                        for (let i = 0; i < studentIds.length; i += 30) {
                            chunks.push(studentIds.slice(i, i + 30));
                        }
                        const gradesPromises = chunks.map(chunk =>
                            getDocs(query(collection(db, 'grades'), where('subject_id', '==', subjectId), where('student_id', 'in', chunk)))
                        );
                        const snaps = await Promise.all(gradesPromises);
                        groupGrades = snaps.flatMap(snap => snap.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                studentId: data.student_id,
                                subjectId: data.subject_id,
                                teacherId: data.teacher_id,
                                value: data.value,
                                type: data.type,
                                status: data.status,
                                comment: data.comment,
                                createdAt: data.created_at,
                                updatedAt: data.updated_at,
                                confirmedBy: data.confirmed_by
                            };
                        })) as Grade[];
                    }

                    set({ groupStudents, groupGrades });
                } catch (error) {
                    console.error("Error fetching group data:", error);
                } finally {
                    set({ isGroupLoading: false });
                }
            },

            login: async (email, password) => {
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;

                    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
                    if (profileDoc.exists()) {
                        const profile = profileDoc.data();
                        set({
                            currentUser: {
                                id: user.uid,
                                username: profile.username,
                                name: profile.full_name,
                                role: profile.role,
                                permissions: profile.permissions || [],
                                phone: profile.phone,
                                avatarUrl: profile.avatar_url,
                                customRoleName: profile.custom_role_name
                            }
                        });
                        await get().fetchData();
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Firebase Auth error:', error);
                    return false;
                }
            },

            logout: async () => {
                await signOut(auth);
                set({ currentUser: null });
            },

            addUser: async (userData) => {
                const { createSystemUser } = await import('@/app/actions/user-actions');
                const result = await createSystemUser({
                    username: userData.username,
                    fullName: userData.name,
                    password: userData.password,
                    role: userData.role,
                    permissions: userData.permissions,
                    customRoleName: userData.customRoleName
                });

                if (result.success) {
                    await get().fetchData();
                } else {
                    console.error('Failed to add user:', result.error);
                }
            },

            updateUser: async (id, data) => {
                const { updateSystemUser } = await import('@/app/actions/user-actions');
                const result = await updateSystemUser(id, data);
                if (result.success) {
                    await get().fetchData();
                } else {
                    console.error('Failed to update user:', result.error);
                }
            },

            removeUser: async (id) => {
                const { deleteSystemUser } = await import('@/app/actions/user-actions');
                const result = await deleteSystemUser(id);
                if (result.success) {
                    await get().fetchData();
                } else {
                    console.error('Failed to remove user:', result.error);
                }
            },

            addGrade: async (teacherId, studentId, subjectId, value, type, comment) => {
                const gradeId = `${studentId}_${subjectId}_${type}`;
                await setDoc(doc(db, 'grades', gradeId), {
                    teacher_id: teacherId,
                    student_id: studentId,
                    subject_id: subjectId,
                    value,
                    type,
                    comment: comment || null,
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                await get().fetchData();
            },

            updateGrade: async (gradeId, value, comment) => {
                await updateDoc(doc(db, 'grades', gradeId), {
                    value,
                    comment: comment || null,
                    updated_at: new Date().toISOString()
                });
                await get().fetchData();
            },

            saveGroupGrades: async (gradesData) => {
                const batch = writeBatch(db);
                gradesData.forEach(g => {
                    const gradeId = `${g.studentId}_${g.subjectId}_${g.type}`;
                    const gradeRef = doc(db, 'grades', gradeId);
                    batch.set(gradeRef, {
                        teacher_id: g.teacherId,
                        student_id: g.studentId,
                        subject_id: g.subjectId,
                        value: g.value,
                        type: g.type,
                        status: 'PENDING',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { merge: true });
                });
                await batch.commit();
                await get().fetchData();
            },

            confirmGrade: async (gradeId, responsibleId) => {
                await updateDoc(doc(db, 'grades', gradeId), {
                    status: 'CONFIRMED',
                    confirmed_by: responsibleId,
                    updated_at: new Date().toISOString()
                });
                await get().fetchData();
            },

            revokeConfirmation: async (gradeId) => {
                await updateDoc(doc(db, 'grades', gradeId), {
                    status: 'PENDING',
                    confirmed_by: null,
                    updated_at: new Date().toISOString()
                });
                await get().fetchData();
            },

            assignTeacher: async (teacherId, subjectId, groupId) => {
                const assignmentId = `${teacherId}_${subjectId}_${groupId}`;
                await setDoc(doc(db, 'teacher_assignments', assignmentId), {
                    teacher_id: teacherId,
                    subject_id: subjectId,
                    group_id: groupId,
                    created_at: new Date().toISOString()
                });
                await get().fetchData();
            },

            removeAssignment: async (teacherId, subjectId, groupId) => {
                const assignmentId = `${teacherId}_${subjectId}_${groupId}`;
                await deleteDoc(doc(db, 'teacher_assignments', assignmentId));
                await get().fetchData();
            },

            addStudent: async (studentData) => {
                try {
                    let groupId = studentData.group;
                    const groupQuery = query(collection(db, 'groups'), where('name', '==', groupId));
                    const groupSnap = await getDocs(groupQuery);

                    if (!groupSnap.empty) {
                        groupId = groupSnap.docs[0].id;
                    } else {
                        const newGroupRef = doc(collection(db, 'groups'));
                        await setDoc(newGroupRef, { name: groupId });
                        groupId = newGroupRef.id;
                    }
                    // Check if student with this HEMIS ID already exists
                    const hemisQuery = query(collection(db, 'students'), where('hemis_id', '==', studentData.hemisId));
                    const hemisSnap = await getDocs(hemisQuery);
                    if (!hemisSnap.empty) {
                        throw new Error(`Студент с HEMIS ID ${studentData.hemisId} уже существует`);
                    }


                    await setDoc(doc(collection(db, 'students')), {
                        hemis_id: studentData.hemisId,
                        full_name: studentData.name,
                        group_id: groupId,
                        nationality: studentData.nationality,
                        gender: studentData.gender || 'Мужской',
                        passport_id: studentData.passportId || '',
                        pinfl: studentData.pinfl || '',
                        course: studentData.course || 1,
                        language: studentData.language || 'Узбекский',
                        academic_year: studentData.academicYear || '2023-2024',
                        semester: studentData.semester || 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    await get().fetchData();
                } catch (error: any) {
                    console.error("Error adding student:", error);
                    throw error;
                }
            },

            bulkAddStudents: async (studentsData) => {
                try {
                    const groupMap: Record<string, string> = {};

                    // 1. Resolve groups (cached/pre-resolved where possible)
                    const groupNames = Array.from(new Set(studentsData.map(s => s.group))).filter(Boolean);
                    const allGroupsSnap = await getDocs(collection(db, 'groups'));
                    allGroupsSnap.forEach(doc => {
                        groupMap[doc.data().name] = doc.id;
                    });

                    // Create missing groups in a separate batch if needed
                    const groupBatch = writeBatch(db);
                    let groupAdded = false;
                    for (const name of groupNames) {
                        if (!groupMap[name]) {
                            const newGRef = doc(collection(db, 'groups'));
                            groupBatch.set(newGRef, { name });
                            groupMap[name] = newGRef.id;
                            groupAdded = true;
                        }
                    }
                    if (groupAdded) await groupBatch.commit();

                    // 2. Add students in chunks of 500 (Firestore limit)
                    const chunkSize = 500;
                    for (let i = 0; i < studentsData.length; i += chunkSize) {
                        const chunk = studentsData.slice(i, i + chunkSize);
                        const batch = writeBatch(db);

                        chunk.forEach(s => {
                            // Use HEMIS ID as the document ID to prevent duplicates efficiently
                            // This makes the operation an UPSERT
                            const studentRef = doc(db, 'students', s.hemisId);
                            batch.set(studentRef, {
                                hemis_id: s.hemisId,
                                full_name: s.name,
                                group_id: groupMap[s.group] || null,
                                nationality: s.nationality || '',
                                gender: s.gender || 'Мужской',
                                passport_id: s.passportId || '',
                                pinfl: s.pinfl || '',
                                course: s.course || 1,
                                language: s.language || 'Узбекский',
                                academic_year: s.academicYear || '2023-2024',
                                semester: s.semester || 1,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }, { merge: true });
                        });

                        await batch.commit();
                        console.log(`Imported batch ${Math.floor(i / chunkSize) + 1}`);
                    }

                    // Update stats
                    await get().fetchStats();
                    // If we are on the students page, refresh it
                    const { studentsPage } = get();
                    if (studentsPage.length > 0) {
                        // This is a bit hacky but works to refresh the current view
                        // Usually the component would call its own refresh
                    }

                } catch (error: any) {
                    console.error("Error in bulk import:", error);
                    throw error;
                }
            },

            removeGroup: async (groupName: string) => {
                try {
                    const batch = writeBatch(db);

                    // 1. Find group ID by name
                    const groupsSnap = await getDocs(query(collection(db, 'groups'), where('name', '==', groupName)));
                    if (groupsSnap.empty) return;

                    const groupDoc = groupsSnap.docs[0];
                    const groupId = groupDoc.id;

                    // 2. Delete the group document
                    batch.delete(groupDoc.ref);

                    // 3. Delete all students in this group
                    const studentsSnap = await getDocs(query(collection(db, 'students'), where('group_id', '==', groupId)));
                    studentsSnap.forEach(doc => {
                        batch.delete(doc.ref);
                    });

                    // 4. Delete all teacher assignments for this group
                    const assignmentsSnap = await getDocs(query(collection(db, 'teacher_assignments'), where('group_id', '==', groupId)));
                    assignmentsSnap.forEach(doc => {
                        batch.delete(doc.ref);
                    });

                    await batch.commit();
                    await get().fetchData();
                } catch (error: any) {
                    console.error("Error removing group:", error);
                    throw error;
                }
            },

            fetchStudentsPage: async (page, pageSize, filters) => {
                set({ isStudentsLoading: true });
                try {
                    // Base query
                    let q = query(collection(db, 'students'), orderBy('full_name'));

                    // Note: Firestore search with startAt/endAt only works for "starts with". 
                    // Substring search is not natively supported.
                    if (filters?.searchTerm) {
                        const term = filters.searchTerm;
                        q = query(q, where('full_name', '>=', term), where('full_name', '<=', term + '\uf8ff'));
                    }

                    if (filters?.course && filters.course !== 'all') {
                        q = query(q, where('course', '==', parseInt(filters.course)));
                    }
                    if (filters?.gender && filters.gender !== 'all') {
                        q = query(q, where('gender', '==', filters.gender));
                    }

                    if (filters?.group && filters.group !== 'all') {
                        const allGroupsSnap = await getDocs(collection(db, 'groups'));
                        const groupDoc = allGroupsSnap.docs.find(d => d.data().name === filters.group);
                        if (groupDoc) {
                            q = query(q, where('group_id', '==', groupDoc.id));
                        }
                    }

                    const countSnap = await getCountFromServer(q);
                    const total = countSnap.data().count;

                    let finalQuery = query(q, limit(pageSize));

                    if (page > 1) {
                        const prevQuery = query(q, limit((page - 1) * pageSize));
                        const prevSnap = await getDocs(prevQuery);
                        if (!prevSnap.empty) {
                            const lastVisible = prevSnap.docs[prevSnap.docs.length - 1];
                            finalQuery = query(q, startAfter(lastVisible), limit(pageSize));
                        }
                    }

                    const studentsSnap = await getDocs(finalQuery);

                    const groupsSnap = await getDocs(collection(db, 'groups'));
                    const groupsMap: Record<string, string> = {};
                    groupsSnap.forEach(doc => {
                        groupsMap[doc.id] = doc.data().name;
                    });

                    const studentsPage = studentsSnap.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            hemisId: data.hemis_id || '',
                            name: data.full_name || '',
                            group: groupsMap[data.group_id] || 'Без группы',
                            nationality: data.nationality || '',
                            gender: data.gender || 'Мужской',
                            passportId: data.passport_id || '',
                            pinfl: data.pinfl || '',
                            course: data.course || 1,
                            language: data.language || 'Узбекский',
                            academicYear: data.academic_year || '2023-2024',
                            semester: data.semester || 1
                        };
                    }) as Student[];

                    set({ studentsPage, studentsTotalCount: total });
                } catch (error) {
                    console.error("Error fetching students page:", error);
                } finally {
                    set({ isStudentsLoading: false });
                }
            },

            fetchGroupsPage: async (page, pageSize, filters) => {
                set({ isGroupsLoading: true });
                try {
                    let q = query(collection(db, 'groups'), orderBy('name'));

                    if (filters?.searchTerm) {
                        const term = filters.searchTerm;
                        q = query(q, where('name', '>=', term), where('name', '<=', term + '\uf8ff'));
                    }

                    // Filtering groups by course/flow is tricky because those aren't stored on the group doc.
                    // For now, we'll just handle searchTerm and pagination.

                    const countSnap = await getCountFromServer(q);
                    const total = countSnap.data().count;

                    let finalQuery = query(q, limit(pageSize));

                    if (page > 1) {
                        const prevQuery = query(q, limit((page - 1) * pageSize));
                        const prevSnap = await getDocs(prevQuery);
                        if (!prevSnap.empty) {
                            const lastVisible = prevSnap.docs[prevSnap.docs.length - 1];
                            finalQuery = query(q, startAfter(lastVisible), limit(pageSize));
                        }
                    }

                    const groupsSnap = await getDocs(finalQuery);
                    const groupsPage = groupsSnap.docs.map(doc => ({
                        id: doc.id,
                        name: doc.data().name
                    }));

                    set({ groupsPage, groupsTotalCount: total });
                } catch (error) {
                    console.error("Error fetching groups page:", error);
                } finally {
                    set({ isGroupsLoading: false });
                }
            },


            addSubject: async (name) => {
                await setDoc(doc(collection(db, 'subjects')), { name, created_at: new Date().toISOString() });
                await get().fetchData();
            },

            removeSubject: async (id) => {
                await deleteDoc(doc(db, 'subjects', id));
                await get().fetchData();
            },

            removeStudent: async (id) => {
                await deleteDoc(doc(db, 'students', id));
                await get().fetchData();
            },

            clearAllStudents: async () => {
                const studentsSnap = await getDocs(collection(db, 'students'));
                const batch = writeBatch(db);
                studentsSnap.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                await get().fetchData();
            },

        }),
        {
            name: 'school-grading-storage',
            partialize: (state) => ({
                currentUser: state.currentUser,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            }
        }
    )
);

