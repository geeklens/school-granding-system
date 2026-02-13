'use server'

import { adminAuth, adminDb } from '@/utils/firebase/admin'
import { revalidatePath } from 'next/cache'

export async function createSystemUser(data: {
    username: string
    fullName: string
    password: string
    role: any
    permissions: string[]
    customRoleName?: string
}) {
    const email = `${data.username}@f.com`

    console.log(`Creating user: ${email}`)

    try {
        // 1. Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password: data.password,
            displayName: data.fullName,
        })

        // 2. Create profile in Firestore
        await adminDb.collection('profiles').doc(userRecord.uid).set({
            id: userRecord.uid,
            username: data.username,
            full_name: data.fullName,
            role: data.role,
            permissions: data.permissions,
            custom_role_name: data.customRoleName || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })

        revalidatePath('/(dashboard)/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error creating user:', error)
        return { success: false, error: error.message }
    }
}

export async function updateSystemUser(id: string, data: any) {
    try {
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        if (data.name) updateData.full_name = data.name
        if (data.role) updateData.role = data.role
        if (data.permissions) updateData.permissions = data.permissions
        if (data.phone) updateData.phone = data.phone
        if (data.avatarUrl) updateData.avatar_url = data.avatarUrl
        if (data.customRoleName) updateData.custom_role_name = data.customRoleName

        await adminDb.collection('profiles').doc(id).update(updateData)

        revalidatePath('/(dashboard)/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating user:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteSystemUser(id: string) {
    try {
        // 1. Delete from Auth
        await adminAuth.deleteUser(id)

        // 2. Delete from Firestore
        await adminDb.collection('profiles').doc(id).delete()

        revalidatePath('/(dashboard)/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting user:', error)
        return { success: false, error: error.message }
    }
}

