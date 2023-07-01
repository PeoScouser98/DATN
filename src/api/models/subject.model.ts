import mongoose from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import { toCapitalize } from '../../helpers/toolkit';
import { ISubjectDocument, TSoftDeleteSubjectModel } from '../../types/subject.type';

const SubjectSchema = new mongoose.Schema<ISubjectDocument>(
	{
		subjectName: {
			type: String,
			required: true
		},
		subjectCode: {
			type: String,
			unique: true,
			uppercase: true,
			required: true
		},
		appliedForGrades: {
			type: [Number],
			required: true,
			default: [1, 2, 3, 4, 5]
		},
		isMainSubject: {
			type: Boolean,
			required: true
		},
		isElectiveSubject: {
			type: Boolean,
			required: true
		}
	},
	{
		versionKey: false,
		collection: 'subjects',
		timestamps: true
	}
);

SubjectSchema.plugin(MongooseDelete, {
	overrideMethods: ['find', 'findOne'],
	deletedAt: true
});

SubjectSchema.pre('save', function (next) {
	this.subjectName = toCapitalize(this.subjectName)!;
	if (this.isMainSubject === true) this.isElectiveSubject = false;
	next();
});

const SubjectModel = mongoose.model<ISubjectDocument>(
	'Subjects',
	SubjectSchema
);

export default SubjectModel;
