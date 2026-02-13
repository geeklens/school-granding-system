"use client"

import { useAppStore } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, ChartBar, CreditCard, Hash, MapPin, Calendar, BookOpen, Globe, UserCircle } from "lucide-react";

export default function StudentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { students, subjects, grades, currentUser, assignments } = useAppStore();

    if (!currentUser) return null;

    const student = students.find(s => s.id === id);

    if (!student) {
        return <div className="p-8 text-center text-muted-foreground">Ученик не найден.</div>;
    }

    // Permission Check: Teachers can only view students in their groups.
    if (currentUser.role === 'TEACHER') {
        const assignedGroups = assignments
            .filter(a => a.teacherId === currentUser.id)
            .map(a => a.groupId);

        if (!assignedGroups.includes(student.group)) {
            return <div className="p-8 text-red-500">Доступ запрещен. Вы не ведете предметы в группе этого ученика.</div>;
        }
    }

    // Calculate Grades per Subject
    const studentGrades = subjects.map(subject => {
        const midterm = grades.find(g => g.studentId === student.id && g.subjectId === subject.id && g.type === 'MIDTERM');
        const final = grades.find(g => g.studentId === student.id && g.subjectId === subject.id && g.type === 'FINAL');

        let avg = "-";
        if (midterm && final) {
            avg = ((midterm.value + final.value) / 2).toFixed(1);
        } else if (midterm) {
            avg = midterm.value.toFixed(1);
        } else if (final) {
            avg = final.value.toFixed(1);
        }

        return {
            subject: subject.name,
            midterm: midterm?.value || "-",
            final: final?.value || "-",
            average: avg
        };
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full border border-border/40 hover:bg-muted/50 transition-all group shrink-0"
                        onClick={() => router.push("/students")}
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
                        <div className="flex items-center gap-4 text-muted-foreground/45 text-[9px] uppercase font-bold tracking-widest mt-0.5">
                            <div className="flex items-center gap-1.5 leading-none">
                                <Hash className="size-2.5" />
                                <span>{student.hemisId}</span>
                            </div>
                            <div className="flex items-center gap-1.5 leading-none">
                                <MapPin className="size-2.5" />
                                <span>{student.group}</span>
                            </div>
                            <div className="flex items-center gap-1.5 border-l border-border/40 pl-4 leading-none hidden md:flex">
                                <Hash className="size-2.5" />
                                <span>JSHSHIR: {student.pinfl}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                    { label: "Курс", value: `${student.course} курс`, icon: Calendar },
                    { label: "Семестр", value: `${student.semester} сем.`, icon: BookOpen },
                    { label: "Паспорт", value: student.passportId || "---", icon: CreditCard },
                    { label: "Год учеб.", value: student.academicYear, icon: Calendar },
                    { label: "Пол", value: student.gender, icon: UserCircle },
                    { label: "Нация", value: student.nationality, icon: Globe },
                    { label: "Язык", value: student.language, icon: Globe },
                ].map((item, idx) => (
                    <div key={idx} className="p-3 border border-border/40 rounded-md bg-transparent">
                        <div className="flex items-center gap-2 mb-1">
                            <item.icon className="w-3 h-3 text-muted-foreground/40" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{item.label}</span>
                        </div>
                        <p className="text-xs font-bold">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="pt-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40 mb-3">Успеваемость</h2>
                <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                    <Table>
                        <TableHeader className="bg-muted/5">
                            <TableRow className="hover:bg-transparent border-border/40">
                                <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[50%]">Предмет</TableHead>
                                <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Midterm</TableHead>
                                <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Final</TableHead>
                                <TableHead className="text-right pr-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Итог</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentGrades.map((g, idx) => (
                                <TableRow key={idx} className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0">
                                    <TableCell className="font-bold text-xs tracking-tight pl-4 py-2.5">{g.subject}</TableCell>
                                    <TableCell className="text-center text-[10px] font-mono text-muted-foreground/60">{g.midterm}</TableCell>
                                    <TableCell className="text-center text-[10px] font-mono text-muted-foreground/60">{g.final}</TableCell>
                                    <TableCell className="text-right pr-4">
                                        <Badge variant="outline" className="h-5 text-[10px] font-bold border-primary/20 text-primary bg-primary/5">
                                            {g.average}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
