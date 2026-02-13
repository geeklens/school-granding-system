"use client"

import { useState } from "react"
import { useAppStore, Grade, GradeStatus } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, CheckCircle, AlertCircle, PlusCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface GradeCellProps {
    studentId: string
    subjectId: string
    currentGrade?: Grade
}

export function GradeCell({ studentId, subjectId, currentGrade }: GradeCellProps) {
    const { currentUser, addGrade, updateGrade, confirmGrade, revokeConfirmation } = useAppStore()
    const [isOpen, setIsOpen] = useState(false)

    // Local state for the form
    const [value, setValue] = useState<number | string>(currentGrade?.value || "")
    const [comment, setComment] = useState(currentGrade?.comment || "")

    // Double confirmation state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    if (!currentUser) return null

    const isTeacher = currentUser.role === 'TEACHER'
    const isAdmin = currentUser.role === 'ADMIN'
    const isResponsible = currentUser.role === 'RESPONSIBLE'
    const isResponsibleOrAdmin = isResponsible || isAdmin

    // Logic for locking
    const isConfirmed = currentGrade?.status === 'CONFIRMED'
    const isLockedForTeacher = isTeacher && isConfirmed

    // Responsible cannot edit value, only confirm/revoke? 
    // Requirement: Responsible confirms pending. 
    // Requirement: Only Admin can revoke/unlock confirmation.

    const handleSave = () => {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue < 1 || numValue > 5) {
            toast.error("Оценка должна быть от 1 до 5")
            return
        }

        if (currentGrade) {
            updateGrade(currentGrade.id, numValue, comment)
            toast.success("Оценка обновлена")
        } else {
            // Legacy support: specific grade cell defaults to MIDTERM if used
            addGrade(currentUser.id, studentId, subjectId, numValue, 'MIDTERM', comment)
            toast.success("Оценка выставлена")
        }
        setIsOpen(false)
    }

    const initiateConfirm = () => {
        setShowConfirmDialog(true)
    }

    const handleFinalConfirm = () => {
        if (currentGrade) {
            confirmGrade(currentGrade.id, currentUser.id)
            toast.success("Оценка успешно подтверждена")
            setShowConfirmDialog(false)
            setIsOpen(false)
        }
    }

    const handleRevoke = () => {
        // Logic from requirements: "после ответсвенный просто подтверждает... после нелзя убрать... этот доступ на удоление подтверждения есть только у админа"
        if (!isAdmin) {
            toast.error("Только Администратор может отменить подтверждение!")
            return;
        }
        if (currentGrade) {
            revokeConfirmation(currentGrade.id)
            toast.info("Подтверждение снято. Учитель может изменить оценку.")
            setIsOpen(false)
        }
    }

    // Render logic for the cell trigger (what shows in the table)
    const renderTrigger = () => {
        if (!currentGrade) {
            // Empty cell, hover to add
            return (
                <div className="w-full h-10 flex items-center justify-center rounded hover:bg-muted cursor-pointer text-muted-foreground group border border-dashed border-border text-xs">
                    <PlusCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )
        }

        return (
            <div className={`
        relative w-full h-10 flex items-center justify-center rounded border cursor-pointer transition-colors
        ${currentGrade.status === 'CONFIRMED'
                    ? 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-400'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-400'}
      `}>
                <span className="font-bold">{currentGrade.value}</span>
                {currentGrade.status === 'CONFIRMED' && (
                    <Lock className="w-3 h-3 absolute top-1 right-1 opacity-50" />
                )}
            </div>
        )
    }

    return (
        <>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    {renderTrigger()}
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Управление Оценкой</h4>
                            <p className="text-sm text-muted-foreground">
                                {currentGrade ?
                                    (currentGrade.status === 'CONFIRMED' ? "Статус: Подтверждено (Закрыто)" : "Статус: Ожидает проверки")
                                    : "Поставьте новую оценку."}
                            </p>
                        </div>

                        {/* Edit Form */}
                        {!isLockedForTeacher && (
                            <div className="grid gap-3">
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="grade">Оценка</Label>
                                    <Input
                                        id="grade"
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="col-span-2 h-8"
                                        disabled={isConfirmed && !isAdmin} // Only Admin can edit confirmed directly, or teacher if pending
                                    />
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="comment">Коммент</Label>
                                    <Textarea
                                        id="comment"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="col-span-2 h-20 text-xs resize-none"
                                        disabled={isConfirmed && !isAdmin}
                                        placeholder="Комментарий (необязательно)..."
                                    />
                                </div>

                                {(!isConfirmed) && (
                                    <Button onClick={handleSave} size="sm">Сохранить</Button>
                                )}
                            </div>
                        )}

                        {/* Teacher View logic for Locked */}
                        {isTeacher && isConfirmed && (
                            <div className="p-2 bg-muted rounded text-xs text-center text-muted-foreground">
                                <Lock className="w-4 h-4 mx-auto mb-1" />
                                Оценка подтверждена. Изменение невозможно.
                            </div>
                        )}

                        {/* Responsible/Admin Actions */}
                        {isResponsibleOrAdmin && currentGrade && (
                            <div className="flex flex-col gap-2 border-t pt-2 mt-2">
                                {currentGrade.status === 'PENDING' ? (
                                    <Button onClick={initiateConfirm} variant="default" className="bg-green-600 hover:bg-green-700 w-full">
                                        <CheckCircle className="w-4 h-4 mr-2" /> Подтвердить
                                    </Button>
                                ) : (
                                    // Only Admin can revoke
                                    isAdmin ? (
                                        <Button onClick={handleRevoke} variant="destructive" className="w-full">
                                            <Unlock className="w-4 h-4 mr-2" /> Снять Подтверждение
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-center text-muted-foreground italic">
                                            Только Админ может отменить.
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Double Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Вы уверены?</DialogTitle>
                        <DialogDescription>
                            Вы собираетесь подтвердить оценку <strong>{currentGrade?.value}</strong>.
                            <br />
                            После этого действия изменить её будет невозможно (только через Админа).
                            <br /><br />
                            Пожалуйста, проверьте комментарий: <span className="italic">"{currentGrade?.comment}"</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Отмена</Button>
                        <Button variant="default" onClick={handleFinalConfirm}>Да, Подтверждаю</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
