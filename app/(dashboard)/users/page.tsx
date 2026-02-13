"use client"

import { useState } from "react"
import {
    useAppStore,
    User,
    Role,
    Permission,
    PERMISSION_LABELS,
    ROLE_PRESETS
} from "@/lib/store"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Edit, Shield, Layout, Users, Key, Search } from "lucide-react"
import { toast } from "sonner"

export default function UsersPage() {
    const { users, currentUser, addUser, updateUser, removeUser } = useAppStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [name, setName] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState<Role>("TEACHER")
    const [customRoleName, setCustomRoleName] = useState("")
    const [permissions, setPermissions] = useState<Permission[]>(ROLE_PRESETS.TEACHER.permissions)

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Shield className="w-16 h-16 text-muted-foreground opacity-20" />
                <div className="text-xl font-semibold opacity-50">Доступ запрещен</div>
                <p className="text-muted-foreground">Только администратор может управлять правами доступа.</p>
            </div>
        )
    }

    const filteredUsers = (users || []).filter(u =>
        (u?.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
        (u?.username || "").toLowerCase().includes((searchTerm || "").toLowerCase())
    )


    const handleOpenDialog = (user?: User) => {
        if (user) {
            setEditingUser(user)
            setName(user.name)
            setUsername(user.username)
            setPassword("") // Password not stored in profile
            setRole(user.role)
            setCustomRoleName(user.customRoleName || "")
            setPermissions(user.permissions || [])
        } else {
            setEditingUser(null)
            setName("")
            setUsername("")
            setPassword("")
            setRole("TEACHER")
            setCustomRoleName("")
            setPermissions(ROLE_PRESETS.TEACHER.permissions)
        }
        setIsDialogOpen(true)
    }

    const handlePresetChange = (val: Role) => {
        setRole(val)
        setPermissions(ROLE_PRESETS[val].permissions)
    }

    const togglePermission = (perm: Permission) => {
        const newPermissions = permissions.includes(perm)
            ? permissions.filter(p => p !== perm)
            : [...permissions, perm];

        setPermissions(newPermissions);

        // Auto-detect role preset
        let matchedRole: Role = 'CUSTOM';
        for (const [r, data] of Object.entries(ROLE_PRESETS)) {
            if (r === 'CUSTOM') continue;
            const presetPerms = data.permissions;
            if (presetPerms.length === newPermissions.length &&
                presetPerms.every(p => newPermissions.includes(p))) {
                matchedRole = r as Role;
                break;
            }
        }
        setRole(matchedRole);
        if (matchedRole !== 'CUSTOM') {
            setCustomRoleName("");
        } else if (!customRoleName) {
            setCustomRoleName("Сотрудник");
        }
    }

    const handleSave = () => {
        if (!name || !username || !password) {
            toast.error("Все поля обязательны!")
            return
        }

        const userData = {
            name,
            username,
            password,
            role,
            customRoleName: role === 'CUSTOM' ? customRoleName : undefined,
            permissions
        }

        if (editingUser) {
            updateUser(editingUser.id, userData)
            toast.success("Данные пользователя обновлены")
        } else {
            addUser(userData)
            toast.success("Новый пользователь успешно добавлен")
        }
        setIsDialogOpen(false)
    }

    const handleDelete = (id: string) => {
        if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
            removeUser(id)
            toast.success("Пользователь удален")
        }
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold opacity-70">Права доступа и аккаунты</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Поиск сотрудников..."
                            className="h-9 pl-8 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-primary shadow-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button size="sm" onClick={() => handleOpenDialog()} className="h-9 px-3">
                        <Plus className="w-4 h-4 mr-1.5" /> Добавить
                    </Button>
                </div>
            </div>

            <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Сотрудник</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center w-[20%]">Роль</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Разрешения</TableHead>
                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[10%]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0 group">
                                <TableCell className="pl-4 py-2.5">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xs tracking-tight">{user.name}</span>
                                        <span className="text-[9px] font-mono text-muted-foreground/40">@{user.username}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="text-[9px] font-bold border-muted/50 py-0 h-4 px-1.5 leading-tight uppercase tracking-tight">
                                        {user.role === 'CUSTOM' ? (user.customRoleName || 'Другая') : ROLE_PRESETS[user.role]?.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {user.permissions?.length > 0 ? (
                                        <span className="text-[10px] font-bold text-muted-foreground/60">{user.permissions.length} PERMS</span>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground/20 italic">No access</span>
                                    )}
                                </TableCell>
                                <TableCell className="pr-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <Button variant="ghost" className="h-7 w-7 p-0" onClick={() => handleOpenDialog(user)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        {user.id !== currentUser.id && (
                                            <Button
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/5"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-md">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Настройка прав сотрудника' : 'Новый сотрудник'}</DialogTitle>
                        <DialogDescription className="text-[11px]">
                            Учетные данные и права доступа в системе.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username" className="text-[10px] uppercase tracking-widest text-primary font-bold">Юзернейм (Логин)</Label>
                                <Input id="username" placeholder="напр. ivanov" className="h-8 text-xs font-mono" value={username} onChange={(e) => setUsername(e.target.value)} />
                                <p className="text-[9px] text-muted-foreground italic">Вход будет: {username ? `${username}@f.com` : '...'} </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">ФИО Сотрудника</Label>
                                <Input id="name" placeholder="Иванов Иван Иванович" className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">Пароль</Label>
                                <Input id="password" type="text" className="h-8 text-xs font-mono" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <div className="grid gap-2 pt-2">
                                <Label className="text-[10px] uppercase tracking-widest text-primary font-bold">Роль (Пресет)</Label>
                                <Select value={role} onValueChange={(val: Role) => handlePresetChange(val)}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLE_PRESETS).map(([roleKey, data]) => (
                                            <SelectItem key={roleKey} value={roleKey} className="text-xs">
                                                {roleKey === 'CUSTOM' ? 'Индивидуальная настройка' : data.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {role === 'CUSTOM' && (
                                <div className="grid gap-2 pt-2 animate-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="customRole" className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Название роли</Label>
                                    <Input
                                        id="customRole"
                                        className="h-8 text-xs bg-amber-500/5 border-amber-500/20"
                                        placeholder="Напр. Ассистент"
                                        value={customRoleName}
                                        onChange={(e) => setCustomRoleName(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="bg-muted/5 rounded-md p-4 border border-border/40">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4 block">
                                <Shield className="w-3 h-3 inline mr-1" /> Разрешения
                            </Label>
                            <div className="space-y-2.5 mt-4">
                                {(Object.entries(PERMISSION_LABELS) as [Permission, string][]).map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label
                                            htmlFor={`perm-${key}`}
                                            className="text-[11px] font-medium leading-none cursor-pointer"
                                        >
                                            {label}
                                        </Label>
                                        <Checkbox
                                            id={`perm-${key}`}
                                            className="h-3.5 w-3.5 rounded-sm"
                                            checked={permissions.includes(key)}
                                            onCheckedChange={() => togglePermission(key)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-border/40 pt-4">
                        <Button variant="ghost" size="sm" className="text-[11px] font-bold uppercase" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                        <Button onClick={handleSave} size="sm" className="text-[11px] font-bold uppercase bg-primary hover:bg-primary/90">
                            {editingUser ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
