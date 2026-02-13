import * as XLSX from 'xlsx';
import { Grade, Student, Subject, User, GradeType } from './store';

export const exportGroupGradesToExcel = (
    currentGroupId: string,
    subjectName: string,
    students: Student[],
    grades: Grade[],
    subjectId: string,
    examType: GradeType
) => {
    // Filter grades for this group and subject
    const data = students.map(student => {
        const gradeObj = grades.find(g =>
            g.studentId === student.id &&
            g.subjectId === subjectId &&
            g.type === examType
        );

        return {
            'ФИО Студента': student.name,
            'HEMIS ID': student.hemisId,
            'Passport': student.passportId,
            'Курс': student.course,
            'Группа': student.group,
            'Предмет': subjectName,
            'Тип экзамена': examType,
            'Балл': gradeObj ? gradeObj.value : '-',
            'Статус': gradeObj ? (gradeObj.status === 'CONFIRMED' ? 'Подтвержден' : 'Ожидает') : 'Нет оценки'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

    // Generate filename
    const filename = `${currentGroupId}_${subjectName}_${examType}.xlsx`;
    XLSX.writeFile(workbook, filename);
};

export const exportAllGradesToExcel = (
    students: Student[],
    grades: Grade[],
    subjects: Subject[],
    users: User[]
) => {
    const data = grades.map(grade => {
        const student = students.find(s => s.id === grade.studentId);
        const subject = subjects.find(s => s.id === grade.subjectId);
        const teacher = users.find(u => u.id === grade.teacherId);
        const confirmedBy = grade.confirmedBy ? users.find(u => u.id === grade.confirmedBy)?.name : '-';

        return {
            'Группа': student?.group || '-',
            'Студент': student?.name || 'Неизвестно',
            'HEMIS ID': student?.hemisId || '-',
            'Предмет': subject?.name || '-',
            'Преподаватель': teacher?.name || '-',
            'Тип': grade.type,
            'Оценка': grade.value,
            'Статус': grade.status === 'CONFIRMED' ? 'Подтвержден' : 'Ожидает',
            'Дата': new Date(grade.updatedAt).toLocaleDateString(),
            'Кем подтверждено': confirmedBy
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All_Grades");

    XLSX.writeFile(workbook, "All_Grades_Report.xlsx");
};
