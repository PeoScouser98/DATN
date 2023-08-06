/* eslint-disable @typescript-eslint/no-non-null-assertion */
import createHttpError from 'http-errors'
import { IClass, TClassSortOption } from '../../types/class.type'
import ClassModel from '../models/class.model'
import { validateClassData, validateClassEditData } from '../validations/class.validation'
import TimeTableModel from '../models/timeTable.model'
import mongoose from 'mongoose'
import { ObjectId } from 'mongodb'

export const getOneClass = async (classId: string) =>
	await ClassModel.findOne({ _id: classId }).populate({
		path: 'totalStudents'
	})

export const getAllClass = async (sortOption: TClassSortOption) =>
	await ClassModel.find().populate({ path: 'totalStudents' }).sort(sortOption)

export const createClass = async (payload: Omit<IClass, '_id'>) => {
	const { error } = validateClassData(payload)
	if (error) throw createHttpError.BadRequest(error.message)
	const existedClass = await ClassModel.exists({
		className: payload.className.toUpperCase()
	})
	if (existedClass) throw createHttpError.Conflict(`Class ${payload.className} already exists`)
	const classResult: IClass = await new ClassModel(payload).save()
	return {
		classes: classResult
	}
}

export const updateClass = async (payload: Partial<Omit<IClass, '_id'>>, classId: string) => {
	const existedClass = await ClassModel.findOne({ _id: classId }).lean()
	if (!existedClass) throw createHttpError.NotFound('Classes does not exist')
	// Check is valid class name
	if (payload.className && !payload.grade && !payload.className.startsWith(JSON.stringify(existedClass?.grade)))
		throw createHttpError.BadRequest(`Invalid Class name, class's name: grade+"A|B|C|D...`)
	// check validate data gửi lên
	const { error } = validateClassEditData(payload)
	if (error) {
		throw createHttpError.BadRequest(error.message)
	}
	if (payload.headTeacher) {
		const existedClassHasCurrentHeadTeacher = await ClassModel.exists({
			class: { $ne: classId },
			headTeacher: payload.headTeacher
		})

		if (existedClassHasCurrentHeadTeacher) {
			await ClassModel.findOneAndUpdate(
				{ _id: existedClassHasCurrentHeadTeacher },
				{ headTeacher: null },
				{ new: true }
			)
		}
	}
	return await ClassModel.findOneAndUpdate(
		{ _id: classId },
		{ ...payload, className: payload.className?.toUpperCase() },
		{ new: true }
	)
}

export const deleteClass = async (classId: string) => {
	const existedClass = await ClassModel.findOne({ _id: classId }).populate('totalStudents')
	if (!existedClass) throw createHttpError.NotFound('Cannot find class to delete')
	if (existedClass.totalStudents! > 0)
		throw createHttpError.Conflict('Cannot delete class due to there are students in this class !')
	await ClassModel.deleteOne({ _id: classId })
	return {
		message: 'Class has been permanently deleted',
		statusCode: 200
	}
}

export const getHeadTeacherClass = async (userId: string) => {
	return await ClassModel.findOne({ headTeacher: userId })
}

export const getTeachingClasses = async (teacherId: string) => {
	const teacherTimeTable = await TimeTableModel.aggregate()
		.match({ teacher: new mongoose.Types.ObjectId(teacherId) })
		.lookup({
			from: 'classes',
			localField: 'class',
			foreignField: '_id',
			as: 'class',
			pipeline: [
				{
					$project: {
						_id: 1,
						className: 1,
						grade: 1
					}
				}
			]
		})
		.group({
			_id: '$class'
		})

	return teacherTimeTable.filter((item) => !!item._id.length).map(({ _id }) => _id.at(0))
}
