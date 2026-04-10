// pages/hr/employees/edit.tsx
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { toast } from '@/components/custom-toast';
import MediaPicker from '@/components/MediaPicker';
import { getImagePath } from '@/utils/helpers';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ZAMBIAN_BANKS = [
    'Zanaco (Zambia National Commercial Bank)',
    'FNB Zambia (First National Bank)',
    'Stanbic Bank Zambia',
    'Absa Bank Zambia',
    'Atlas Mara Bank Zambia',
    'Citibank Zambia',
    'Bank of China Zambia',
    'Indo Zambia Bank',
    'United Bank for Africa (UBA) Zambia',
    'Access Bank Zambia',
    'First Alliance Bank Zambia',
    'Madison Finance',
    'Investrust Bank Zambia',
    'Development Bank of Zambia',
    'Bank of Zambia',
];

const RELATIONSHIP_OPTIONS = [
    'Father', 'Mother', 'Son', 'Daughter', 'Sister',
    'Brother', 'Wife', 'Husband', 'Grandparent', 'Other',
];

export default function EmployeeEdit() {
    const { t } = useTranslation();
    const { employee, branches, departments, designations, documentTypes, shifts, attendancePolicies } = usePage().props as any;

    const existingRelationship = employee.employee?.emergency_contact_relationship || '';
    const isOtherRelationship = existingRelationship !== '' && !RELATIONSHIP_OPTIONS.includes(existingRelationship);

    const [formData, setFormData] = useState<Record<string, any>>({
        name:           employee.name || '',
        title:          employee.employee?.title || '',
        first_name:     employee.employee?.first_name || '',
        middle_name:    employee.employee?.middle_name || '',
        last_name:      employee.employee?.last_name || '',
        nationality:    employee.employee?.nationality || '',
        marital_status: employee.employee?.marital_status || '',
        nrc:            employee.employee?.nrc || '',
        passport_no:    employee.employee?.passport_no || '',
        permit_no:      employee.employee?.permit_no || '',
        tpin:           employee.employee?.tpin || '',
        employee_id:    employee.employee?.employee_id || '',
        biometric_emp_id: employee.employee?.biometric_emp_id || '',
        email:          employee.email || '',
        password:       '',
        phone:          employee.employee?.phone || '',
        date_of_birth:  employee.employee?.date_of_birth || '',
        gender:         employee.employee?.gender || '',

        // Employment Details
        branch_id:            employee.employee?.branch_id ? employee.employee.branch_id.toString() : '',
        department_id:        employee.employee?.department_id ? employee.employee.department_id.toString() : '',
        designation_id:       employee.employee?.designation_id ? employee.employee.designation_id.toString() : '',
        shift_id:             employee.employee?.shift_id ? employee.employee.shift_id.toString() : '',
        attendance_policy_id: employee.employee?.attendance_policy_id ? employee.employee.attendance_policy_id.toString() : '',
        date_of_joining:      employee.employee?.date_of_joining || '',
        employment_type:      employee.employee?.employment_type || 'Full-time',
        employee_status:      employee.employee?.employee_status || 'active',
        napsa_number:         employee.employee?.napsa_number || '',
        nhima_number:         employee.employee?.nhima_number || '',
        salary:               employee.employee?.base_salary || '',

        // Contact
        address_line_1:                      employee.employee?.address_line_1 || '',
        address_line_2:                      employee.employee?.address_line_2 || '',
        city:                                employee.employee?.city || '',
        state:                               employee.employee?.state || '',
        country:                             employee.employee?.country || '',
        postal_code:                         employee.employee?.postal_code || '',
        emergency_contact_name:              employee.employee?.emergency_contact_name || '',
        emergency_contact_relationship:      isOtherRelationship ? 'Other' : existingRelationship,
        emergency_contact_relationship_other: isOtherRelationship ? existingRelationship : '',
        emergency_contact_number:            employee.employee?.emergency_contact_number || '',

        // Banking
        payment_method:       employee.employee?.payment_method || '',
        bank_name:            employee.employee?.bank_name || '',
        account_holder_name:  employee.employee?.account_holder_name || '',
        account_number:       employee.employee?.account_number || '',
        bank_identifier_code: employee.employee?.bank_identifier_code || '',
        bank_branch:          employee.employee?.bank_branch || '',

        // Exemptions
        exempt_from_napsa: employee.employee?.exempt_from_napsa ?? false,
        exempt_from_nhima: employee.employee?.exempt_from_nhima ?? false,
        exempt_from_sdl:   employee.employee?.exempt_from_sdl ?? false,

        documents: [],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingDocuments, setExistingDocuments] = useState<any[]>(employee.employee?.documents || []);
    const [newDocuments, setNewDocuments] = useState<any[]>([]);

    // Departments are global — no branch filter needed (same as create)
    const filteredDepartments = departments;

    // Designations are global — no department filter needed (same as create)
    const allDesignations = designations;

    const handleChange = (name: string, value: any) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleNewDocumentChange = (index: number, field: string, value: any) => {
        const updatedDocuments = [...newDocuments];
        updatedDocuments[index] = { ...updatedDocuments[index], [field]: value };
        setNewDocuments(updatedDocuments);
        const errorKey = `documents.${index}.${field}`;
        if (errors[errorKey]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const addNewDocument = () => {
        setNewDocuments([...newDocuments, { document_type_id: '', file: null, expiry_date: '' }]);
    };

    const removeNewDocument = (index: number) => {
        const updatedDocuments = [...newDocuments];
        updatedDocuments.splice(index, 1);
        setNewDocuments(updatedDocuments);
        const newErrors = { ...errors };
        Object.keys(newErrors).forEach((key) => {
            if (key.startsWith(`documents.${index}.`)) delete newErrors[key];
        });
        setErrors(newErrors);
    };

    const removeExistingDocument = (documentId: number) => {
        router.delete(route('hr.employees.documents.destroy', [employee.id, documentId]), {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
                setExistingDocuments(existingDocuments.filter((doc) => doc.id !== documentId));
            },
            onError: (errors) => {
                setIsSubmitting(false);
                setErrors(errors);
                toast.error(t('Please correct the errors in the form'));
                setTimeout(() => {
                    const firstError = document.querySelector('.border-red-500');
                    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submitData = new FormData();
        submitData.append('_method', 'PUT');

        const relationshipValue =
            formData.emergency_contact_relationship === 'Other'
                ? formData.emergency_contact_relationship_other
                : formData.emergency_contact_relationship;

        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'documents' || key === 'emergency_contact_relationship_other') return;
            if (key === 'emergency_contact_relationship') {
                submitData.append(key, relationshipValue);
                return;
            }
            if (value !== null && value !== undefined && value !== '') {
                submitData.append(key, value);
            }
        });

        if (formData.profile_image) {
            submitData.append('profile_image', formData.profile_image);
        }

        newDocuments.forEach((doc: any, index: number) => {
            if (doc.document_type_id) submitData.append(`documents[${index}][document_type_id]`, doc.document_type_id);
            if (doc.file_path)        submitData.append(`documents[${index}][file_path]`, doc.file_path);
            if (doc.expiry_date)      submitData.append(`documents[${index}][expiry_date]`, doc.expiry_date);
        });

        router.post(route('hr.employees.update', employee.employee?.id), submitData, {
            forceFormData: true,
            onSuccess: (page) => {
                setIsSubmitting(false);
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                router.get(route('hr.employees.index'));
            },
            onError: (errors) => {
                setIsSubmitting(false);
                setErrors(errors);
                toast.error(t('Please correct the errors in the form'));
                setTimeout(() => {
                    const firstError = document.querySelector('.border-red-500');
                    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            },
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('HR Management'), href: route('hr.employees.index') },
        { title: t('Employees'), href: route('hr.employees.index') },
        { title: t('Edit Employee') },
    ];

    return (
        <PageTemplate
            title={t('Edit Employee')}
            url={`/hr/employees/${employee.id}/edit`}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="mr-2 h-4 w-4" />,
                    variant: 'outline',
                    onClick: () => router.get(route('hr.employees.index')),
                },
            ]}
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Basic Information')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">{t('Title')}</Label>
                                <Select value={formData.title} onValueChange={(value) => handleChange('title', value)}>
                                    <SelectTrigger className={errors.title ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Title')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Mr">{t('Mr')}</SelectItem>
                                        <SelectItem value="Mrs">{t('Mrs')}</SelectItem>
                                        <SelectItem value="Miss">{t('Miss')}</SelectItem>
                                        <SelectItem value="Dr">{t('Dr')}</SelectItem>
                                        <SelectItem value="Father">{t('Father')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                            </div>

                            {/* First Name */}
                            <div className="space-y-2">
                                <Label htmlFor="first_name" required>{t('First Name')}</Label>
                                <Input id="first_name" required value={formData.first_name}
                                    onChange={(e) => handleChange('first_name', e.target.value)}
                                    className={errors.first_name ? 'border-red-500' : ''} />
                                {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                            </div>

                            {/* Middle Name */}
                            <div className="space-y-2">
                                <Label htmlFor="middle_name">{t('Middle Name')}</Label>
                                <Input id="middle_name" value={formData.middle_name}
                                    onChange={(e) => handleChange('middle_name', e.target.value)}
                                    className={errors.middle_name ? 'border-red-500' : ''} />
                                {errors.middle_name && <p className="text-xs text-red-500">{errors.middle_name}</p>}
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <Label htmlFor="last_name" required>{t('Last Name')}</Label>
                                <Input id="last_name" required value={formData.last_name}
                                    onChange={(e) => handleChange('last_name', e.target.value)}
                                    className={errors.last_name ? 'border-red-500' : ''} />
                                {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" required>{t('Email')}</Label>
                                <Input id="email" type="email" required value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className={errors.email ? 'border-red-500' : ''} />
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    {t('Password')}{' '}
                                    <span className="text-muted-foreground text-sm">{t('(Leave blank to keep current)')}</span>
                                </Label>
                                <Input id="password" type="password" value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    className={errors.password ? 'border-red-500' : ''} />
                                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" required>{t('Phone Number')}</Label>
                                <Input id="phone" required value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className={errors.phone ? 'border-red-500' : ''} />
                                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth" required>
                                    {t('Date of Birth')}{' '}
                                    <span className="text-muted-foreground text-xs">(Must be 18+)</span>
                                </Label>
                                <div className="cursor-pointer" onClick={(e) => {
                                    const input = (e.currentTarget as HTMLElement).querySelector('input');
                                    try { (input as any)?.showPicker?.(); } catch { input?.focus(); }
                                }}>
                                    <Input id="date_of_birth" type="date" required
                                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                        value={formData.date_of_birth}
                                        onChange={(e) => handleChange('date_of_birth', e.target.value)}
                                        className={`cursor-pointer ${errors.date_of_birth ? 'border-red-500' : ''}`} />
                                </div>
                                {errors.date_of_birth && <p className="text-xs text-red-500">{errors.date_of_birth}</p>}
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <Label required>{t('Gender')}</Label>
                                <RadioGroup value={formData.gender}
                                    onValueChange={(value) => handleChange('gender', value)}
                                    className="flex space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="gender-male" />
                                        <Label htmlFor="gender-male">{t('Male')}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="gender-female" />
                                        <Label htmlFor="gender-female">{t('Female')}</Label>
                                    </div>
                                </RadioGroup>
                                {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                            </div>

                            {/* Nationality */}
                            <div className="space-y-2">
                                <Label htmlFor="nationality" required>{t('Nationality')}</Label>
                                <Select value={formData.nationality} onValueChange={(value) => handleChange('nationality', value)}>
                                    <SelectTrigger className={errors.nationality ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Nationality')} />
                                    </SelectTrigger>
                                    <SelectContent searchable={true}>
                                        {[
                                            'Afghan','Albanian','Algerian','American','Andorran','Angolan','Antiguan',
                                            'Argentine','Armenian','Australian','Austrian','Azerbaijani','Bahamian',
                                            'Bahraini','Bangladeshi','Barbadian','Belarusian','Belgian','Belizean',
                                            'Beninese','Bhutanese','Bolivian','Bosnian','Botswanan','Brazilian',
                                            'British','Bruneian','Bulgarian','Burkinabe','Burundian','Cambodian',
                                            'Cameroonian','Canadian','Cape Verdean','Central African','Chadian',
                                            'Chilean','Chinese','Colombian','Comoran','Congolese','Costa Rican',
                                            'Croatian','Cuban','Cypriot','Czech','Danish','Djiboutian','Dominican',
                                            'Dutch','Ecuadorian','Egyptian','Emirati','Equatorial Guinean','Eritrean',
                                            'Estonian','Ethiopian','Fijian','Finnish','French','Gabonese','Gambian',
                                            'Georgian','German','Ghanaian','Greek','Grenadian','Guatemalan','Guinean',
                                            'Guyanese','Haitian','Honduran','Hungarian','Icelandic','Indian',
                                            'Indonesian','Iranian','Iraqi','Irish','Israeli','Italian','Ivorian',
                                            'Jamaican','Japanese','Jordanian','Kazakhstani','Kenyan','Korean',
                                            'Kuwaiti','Kyrgyz','Laotian','Latvian','Lebanese','Lesothan','Liberian',
                                            'Libyan','Liechtenstein','Lithuanian','Luxembourgish','Macedonian',
                                            'Malagasy','Malawian','Malaysian','Maldivian','Malian','Maltese',
                                            'Mauritanian','Mauritian','Mexican','Moldovan','Monacan','Mongolian',
                                            'Montenegrin','Moroccan','Mozambican','Namibian','Nepalese','New Zealand',
                                            'Nicaraguan','Nigerian','Norwegian','Omani','Pakistani','Palauan',
                                            'Palestinian','Panamanian','Papuan','Paraguayan','Peruvian','Filipino',
                                            'Polish','Portuguese','Qatari','Romanian','Russian','Rwandan','Saudi',
                                            'Senegalese','Serbian','Sierra Leonean','Singaporean','Slovak','Slovenian',
                                            'Somali','South African','South Sudanese','Spanish','Sri Lankan','Sudanese',
                                            'Surinamese','Swazi','Swedish','Swiss','Syrian','Taiwanese','Tajik',
                                            'Tanzanian','Thai','Togolese','Trinidadian','Tunisian','Turkish','Turkmen',
                                            'Ugandan','Ukrainian','Uruguayan','Uzbek','Venezuelan','Vietnamese',
                                            'Yemeni','Zambian','Zimbabwean',
                                        ].map((nat) => (
                                            <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.nationality && <p className="text-xs text-red-500">{errors.nationality}</p>}
                            </div>

                            {/* Marital Status */}
                            <div className="space-y-2">
                                <Label htmlFor="marital_status" required>{t('Marital Status')}</Label>
                                <Select value={formData.marital_status} onValueChange={(value) => handleChange('marital_status', value)}>
                                    <SelectTrigger className={errors.marital_status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Marital Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">{t('Single')}</SelectItem>
                                        <SelectItem value="married">{t('Married')}</SelectItem>
                                        <SelectItem value="divorced">{t('Divorced')}</SelectItem>
                                        <SelectItem value="widowed">{t('Widowed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.marital_status && <p className="text-xs text-red-500">{errors.marital_status}</p>}
                            </div>

                            {/* NRC / Passport */}
                            {formData.nationality === 'Zambian' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="nrc" required>{t('NRC (National Registration Card)')}</Label>
                                    <Input id="nrc" value={formData.nrc}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length > 6) val = val.slice(0, 6) + '/' + val.slice(6);
                                            if (val.length > 9) val = val.slice(0, 9) + '/' + val.slice(9);
                                            if (val.length > 11) val = val.slice(0, 11);
                                            handleChange('nrc', val);
                                        }}
                                        placeholder="e.g. 123456/78/9" maxLength={11}
                                        className={errors.nrc ? 'border-red-500' : ''} />
                                    <p className="text-muted-foreground text-xs">{t('Format: XXXXXX/XX/X')}</p>
                                    {errors.nrc && <p className="text-xs text-red-500">{errors.nrc}</p>}
                                </div>
                            ) : formData.nationality ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="passport_no" required>{t('Passport No')}</Label>
                                        <Input id="passport_no" value={formData.passport_no}
                                            onChange={(e) => handleChange('passport_no', e.target.value)}
                                            placeholder={t('Enter passport number')}
                                            className={errors.passport_no ? 'border-red-500' : ''} />
                                        {errors.passport_no && <p className="text-xs text-red-500">{errors.passport_no}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="permit_no">{t('Permit No')}</Label>
                                        <Input id="permit_no" value={formData.permit_no}
                                            onChange={(e) => handleChange('permit_no', e.target.value)}
                                            placeholder={t('Enter permit number')}
                                            className={errors.permit_no ? 'border-red-500' : ''} />
                                        {errors.permit_no && <p className="text-xs text-red-500">{errors.permit_no}</p>}
                                    </div>
                                </>
                            ) : null}

                            {/* TPIN */}
                            <div className="space-y-2">
                                <Label htmlFor="tpin" required>{t('TPIN (Tax ID)')}</Label>
                                <Input id="tpin" value={formData.tpin}
                                    onChange={(e) => handleChange('tpin', e.target.value)}
                                    placeholder="e.g. 1234567890"
                                    className={errors.tpin ? 'border-red-500' : ''} />
                                {errors.tpin && <p className="text-xs text-red-500">{errors.tpin}</p>}
                            </div>

                            {/* Employee Code */}
                            <div className="space-y-2">
                                <Label htmlFor="biometric_emp_id" required>{t('Employee Code')}</Label>
                                <Input id="biometric_emp_id" required value={formData.biometric_emp_id || ''}
                                    onChange={(e) => handleChange('biometric_emp_id', e.target.value)}
                                    className={errors.biometric_emp_id ? 'border-red-500' : ''} />
                                <p className="text-muted-foreground text-sm">
                                    {t('This ID will be used to map employee with biometric device.')}
                                </p>
                                {errors.biometric_emp_id && <p className="text-xs text-red-500">{errors.biometric_emp_id}</p>}
                            </div>

                            {/* Employee ID — read-only */}
                            <div className="space-y-2">
                                <Label htmlFor="employee_id">{t('Employee ID')}</Label>
                                <Input id="employee_id" value={formData.employee_id} readOnly className="bg-muted" />
                                <p className="text-muted-foreground text-sm">{t('Employee ID cannot be changed')}</p>
                            </div>

                            {/* Profile Image */}
                            <div className="space-y-2">
                                <Label>{t('Profile Image')}</Label>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-muted/30 flex h-32 items-center justify-center rounded-md border p-4">
                                        {formData.profile_image || employee.avatar ? (
                                            <img
                                                src={formData.profile_image ? getImagePath(formData.profile_image) : employee.avatar}
                                                alt="Profile Image"
                                                className="max-h-full max-w-full rounded-full object-contain"
                                            />
                                        ) : (
                                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full border border-dashed">
                                                    <span className="text-muted-foreground text-xs font-semibold">{t('Image')}</span>
                                                </div>
                                                <span className="text-xs">No image selected</span>
                                            </div>
                                        )}
                                    </div>
                                    <MediaPicker
                                        label=""
                                        value={formData.profile_image || employee.avatar || ''}
                                        onChange={(url) => handleChange('profile_image', url)}
                                        placeholder="Select profile image..."
                                        showPreview={false}
                                    />
                                </div>
                                {errors.profile_image && <p className="text-xs text-red-500">{errors.profile_image}</p>}
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* Employment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Employment Details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                            {/* Branch */}
                            <div className="space-y-2">
                                <Label htmlFor="branch_id">{t('Branch')}</Label>
                                <Select value={formData.branch_id} onValueChange={(value) => handleChange('branch_id', value)}>
                                    <SelectTrigger className={errors.branch_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Branch')} />
                                    </SelectTrigger>
                                    <SelectContent searchable={true}>
                                        {branches.map((branch: any) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.branch_id && <p className="text-xs text-red-500">{errors.branch_id}</p>}
                            </div>

                            {/* Department — global, no branch filter */}
                            <div className="space-y-2">
                                <Label htmlFor="department_id">{t('Department')}</Label>
                                <Select value={formData.department_id}
                                    onValueChange={(value) => handleChange('department_id', value)}>
                                    <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Department')} />
                                    </SelectTrigger>
                                    <SelectContent searchable={true}>
                                        {filteredDepartments.map((department: any) => (
                                            <SelectItem key={department.id} value={department.id.toString()}>
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.department_id && <p className="text-xs text-red-500">{errors.department_id}</p>}
                            </div>

                            {/* Designation — global, no department filter */}
                            <div className="space-y-2">
                                <Label htmlFor="designation_id">{t('Designation')}</Label>
                                <Select value={formData.designation_id}
                                    onValueChange={(value) => handleChange('designation_id', value)}>
                                    <SelectTrigger className={errors.designation_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Designation')} />
                                    </SelectTrigger>
                                    <SelectContent searchable={true}>
                                        {allDesignations.map((designation: any) => (
                                            <SelectItem key={designation.id} value={designation.id.toString()}>
                                                {designation.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.designation_id && <p className="text-xs text-red-500">{errors.designation_id}</p>}
                            </div>

                            {/* Date of Joining */}
                            <div className="space-y-2">
                                <Label htmlFor="date_of_joining">{t('Date of Joining')}</Label>
                                <div className="cursor-pointer" onClick={(e) => {
                                    const input = (e.currentTarget as HTMLElement).querySelector('input');
                                    try { (input as any)?.showPicker?.(); } catch { input?.focus(); }
                                }}>
                                    <Input id="date_of_joining" type="date" value={formData.date_of_joining}
                                        onChange={(e) => handleChange('date_of_joining', e.target.value)}
                                        className={`cursor-pointer ${errors.date_of_joining ? 'border-red-500' : ''}`} />
                                </div>
                                {errors.date_of_joining && <p className="text-xs text-red-500">{errors.date_of_joining}</p>}
                            </div>

                            {/* Employment Type */}
                            <div className="space-y-2">
                                <Label htmlFor="employment_type">{t('Employment Type')}</Label>
                                <Select value={formData.employment_type}
                                    onValueChange={(value) => handleChange('employment_type', value)}>
                                    <SelectTrigger className={errors.employment_type ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Employment Type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full-time">{t('Full-time')}</SelectItem>
                                        <SelectItem value="Part-time">{t('Part-time')}</SelectItem>
                                        <SelectItem value="Contract">{t('Contract')}</SelectItem>
                                        <SelectItem value="Internship">{t('Internship')}</SelectItem>
                                        <SelectItem value="Temporary">{t('Temporary')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.employment_type && <p className="text-xs text-red-500">{errors.employment_type}</p>}
                            </div>

                            {/* Employee Status */}
                            <div className="space-y-2">
                                <Label htmlFor="employee_status">{t('Employee Status')}</Label>
                                <Select value={formData.employee_status}
                                    onValueChange={(value) => handleChange('employee_status', value)}>
                                    <SelectTrigger className={errors.employee_status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Employee Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        <SelectItem value="probation">{t('Probation')}</SelectItem>
                                        <SelectItem value="suspended">{t('Suspended')}</SelectItem>
                                        <SelectItem value="terminated">{t('Terminated')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.employee_status && <p className="text-xs text-red-500">{errors.employee_status}</p>}
                            </div>

                            {/* Shift */}
                            <div className="space-y-2">
                                <Label htmlFor="shift_id">{t('Shift')}</Label>
                                <Select value={formData.shift_id}
                                    onValueChange={(value) => handleChange('shift_id', value)}>
                                    <SelectTrigger className={errors.shift_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Shift (Optional)')} />
                                    </SelectTrigger>
                                    <SelectContent searchable={true}>
                                        {shifts?.map((shift: any) => (
                                            <SelectItem key={shift.id} value={shift.id.toString()}>
                                                {shift.name} ({shift.start_time} - {shift.end_time})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.shift_id && <p className="text-xs text-red-500">{errors.shift_id}</p>}
                            </div>

                            {/* Attendance Policy */}
                            <div className="space-y-2">
                                <Label htmlFor="attendance_policy_id">{t('Attendance Policy')}</Label>
                                <Select value={formData.attendance_policy_id}
                                    onValueChange={(value) => handleChange('attendance_policy_id', value)}>
                                    <SelectTrigger className={errors.attendance_policy_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Attendance Policy (Optional)')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {attendancePolicies?.map((policy: any) => (
                                            <SelectItem key={policy.id} value={policy.id.toString()}>
                                                {policy.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.attendance_policy_id && <p className="text-xs text-red-500">{errors.attendance_policy_id}</p>}
                            </div>

                            {/* NAPSA */}
                            <div className="space-y-2">
                                <Label htmlFor="napsa_number">{t('NAPSA Registration Number')}</Label>
                                <Input id="napsa_number" value={formData.napsa_number}
                                    onChange={(e) => handleChange('napsa_number', e.target.value)}
                                    placeholder="e.g. NAPSA-000123"
                                    className={errors.napsa_number ? 'border-red-500' : ''} />
                                {errors.napsa_number && <p className="text-xs text-red-500">{errors.napsa_number}</p>}
                            </div>

                            {/* NHIMA */}
                            <div className="space-y-2">
                                <Label htmlFor="nhima_number">{t('NHIMA Registration Number')}</Label>
                                <Input id="nhima_number" value={formData.nhima_number}
                                    onChange={(e) => handleChange('nhima_number', e.target.value)}
                                    placeholder="e.g. NHIMA-000123"
                                    className={errors.nhima_number ? 'border-red-500' : ''} />
                                {errors.nhima_number && <p className="text-xs text-red-500">{errors.nhima_number}</p>}
                            </div>

                            {/* Base Salary */}
                            <div className="space-y-2">
                                <Label htmlFor="salary">{t('Base Salary')}</Label>
                                <Input id="salary" type="number" step="0.01" value={formData.salary}
                                    onChange={(e) => handleChange('salary', e.target.value)}
                                    className={errors.salary ? 'border-red-500' : ''} />
                                {errors.salary && <p className="text-xs text-red-500">{errors.salary}</p>}
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Contact Information')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="address_line_1" required>{t('Address Line 1')}</Label>
                                <Input id="address_line_1" required value={formData.address_line_1}
                                    onChange={(e) => handleChange('address_line_1', e.target.value)}
                                    className={errors.address_line_1 ? 'border-red-500' : ''} />
                                {errors.address_line_1 && <p className="text-xs text-red-500">{errors.address_line_1}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address_line_2">{t('Address Line 2')}</Label>
                                <Input id="address_line_2" value={formData.address_line_2}
                                    onChange={(e) => handleChange('address_line_2', e.target.value)}
                                    className={errors.address_line_2 ? 'border-red-500' : ''} />
                                {errors.address_line_2 && <p className="text-xs text-red-500">{errors.address_line_2}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city" required>{t('City')}</Label>
                                <Input id="city" required value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    className={errors.city ? 'border-red-500' : ''} />
                                {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="state" required>{t('State/Province')}</Label>
                                <Input id="state" required value={formData.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    className={errors.state ? 'border-red-500' : ''} />
                                {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country" required>{t('Country')}</Label>
                                <Input id="country" required value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                    className={errors.country ? 'border-red-500' : ''} />
                                {errors.country && <p className="text-xs text-red-500">{errors.country}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="postal_code">{t('Postal/Zip Code')}</Label>
                                <Input id="postal_code" value={formData.postal_code}
                                    onChange={(e) => handleChange('postal_code', e.target.value)}
                                    className={errors.postal_code ? 'border-red-500' : ''} />
                                {errors.postal_code && <p className="text-xs text-red-500">{errors.postal_code}</p>}
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="mt-6">
                            <h3 className="mb-4 text-lg font-medium">{t('Emergency Contact')}</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_name" required>{t('Name')}</Label>
                                    <Input id="emergency_contact_name" required value={formData.emergency_contact_name}
                                        onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                                        className={errors.emergency_contact_name ? 'border-red-500' : ''} />
                                    {errors.emergency_contact_name && <p className="text-xs text-red-500">{errors.emergency_contact_name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_relationship" required>{t('Relationship')}</Label>
                                    <Select value={formData.emergency_contact_relationship}
                                        onValueChange={(value) => handleChange('emergency_contact_relationship', value)}>
                                        <SelectTrigger className={errors.emergency_contact_relationship ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select Relationship')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RELATIONSHIP_OPTIONS.map((rel) => (
                                                <SelectItem key={rel} value={rel}>{t(rel)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.emergency_contact_relationship && (
                                        <p className="text-xs text-red-500">{errors.emergency_contact_relationship}</p>
                                    )}
                                    {formData.emergency_contact_relationship === 'Other' && (
                                        <Input className="mt-2"
                                            placeholder={t('Please specify relationship')}
                                            value={formData.emergency_contact_relationship_other}
                                            onChange={(e) => handleChange('emergency_contact_relationship_other', e.target.value)} />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_number" required>{t('Phone Number')}</Label>
                                    <Input id="emergency_contact_number" required value={formData.emergency_contact_number}
                                        onChange={(e) => handleChange('emergency_contact_number', e.target.value)}
                                        className={errors.emergency_contact_number ? 'border-red-500' : ''} />
                                    {errors.emergency_contact_number && <p className="text-xs text-red-500">{errors.emergency_contact_number}</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Banking Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Banking Information')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="payment_method" required>{t('Payment Method')}</Label>
                            <Select value={formData.payment_method}
                                onValueChange={(value) => handleChange('payment_method', value)}>
                                <SelectTrigger className={errors.payment_method ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select Payment Method')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">{t('Cash')}</SelectItem>
                                    <SelectItem value="Mobile Money">{t('Mobile Money')}</SelectItem>
                                    <SelectItem value="EFT">{t('EFT (Electronic Funds Transfer)')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method}</p>}
                        </div>

                        {formData.payment_method === 'EFT' && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name" required>{t('Bank Name')}</Label>
                                    <Select value={formData.bank_name}
                                        onValueChange={(value) => handleChange('bank_name', value)}>
                                        <SelectTrigger className={errors.bank_name ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select Bank')} />
                                        </SelectTrigger>
                                        <SelectContent searchable={true}>
                                            {ZAMBIAN_BANKS.map((bank) => (
                                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.bank_name && <p className="text-xs text-red-500">{errors.bank_name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="account_holder_name" required>{t('Account Holder Name')}</Label>
                                    <Input id="account_holder_name" required value={formData.account_holder_name}
                                        onChange={(e) => handleChange('account_holder_name', e.target.value)}
                                        className={errors.account_holder_name ? 'border-red-500' : ''} />
                                    {errors.account_holder_name && <p className="text-xs text-red-500">{errors.account_holder_name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="account_number" required>{t('Account Number')}</Label>
                                    <Input id="account_number" required value={formData.account_number}
                                        onChange={(e) => handleChange('account_number', e.target.value)}
                                        className={errors.account_number ? 'border-red-500' : ''} />
                                    {errors.account_number && <p className="text-xs text-red-500">{errors.account_number}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bank_identifier_code">{t('Bank Identifier Code (BIC/SWIFT)')}</Label>
                                    <Input id="bank_identifier_code" value={formData.bank_identifier_code}
                                        onChange={(e) => handleChange('bank_identifier_code', e.target.value)}
                                        className={errors.bank_identifier_code ? 'border-red-500' : ''} />
                                    {errors.bank_identifier_code && <p className="text-xs text-red-500">{errors.bank_identifier_code}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bank_branch">{t('Bank Branch')}</Label>
                                    <Input id="bank_branch" value={formData.bank_branch}
                                        onChange={(e) => handleChange('bank_branch', e.target.value)}
                                        className={errors.bank_branch ? 'border-red-500' : ''} />
                                    {errors.bank_branch && <p className="text-xs text-red-500">{errors.bank_branch}</p>}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Statutory Exemptions */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Statutory Exemptions')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4 text-sm">
                            {t('Check the boxes below if this employee is exempt from specific statutory contributions. Exemptions apply to employees who have reached retirement age or based on specific contract terms.')}
                        </p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="bg-muted/20 flex items-start space-x-3 rounded-md border p-4">
                                <input type="checkbox" id="exempt_from_napsa"
                                    checked={formData.exempt_from_napsa}
                                    onChange={(e) => handleChange('exempt_from_napsa', e.target.checked)}
                                    className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300" />
                                <div>
                                    <Label htmlFor="exempt_from_napsa" className="cursor-pointer font-medium">
                                        {t('Exempt from NAPSA')}
                                    </Label>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {t('National Pension Scheme Authority — employee and employer contributions will be skipped.')}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/20 flex items-start space-x-3 rounded-md border p-4">
                                <input type="checkbox" id="exempt_from_nhima"
                                    checked={formData.exempt_from_nhima}
                                    onChange={(e) => handleChange('exempt_from_nhima', e.target.checked)}
                                    className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300" />
                                <div>
                                    <Label htmlFor="exempt_from_nhima" className="cursor-pointer font-medium">
                                        {t('Exempt from NHIMA')}
                                    </Label>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {t('National Health Insurance — contributions will be skipped for this employee.')}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/20 flex items-start space-x-3 rounded-md border p-4">
                                <input type="checkbox" id="exempt_from_sdl"
                                    checked={formData.exempt_from_sdl}
                                    onChange={(e) => handleChange('exempt_from_sdl', e.target.checked)}
                                    className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300" />
                                <div>
                                    <Label htmlFor="exempt_from_sdl" className="cursor-pointer font-medium">
                                        {t('Exempt from SDL')}
                                    </Label>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {t('Skills Development Levy — employer SDL contribution will be skipped for this employee.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Documents')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Existing Documents */}
                        {existingDocuments.length > 0 && (
                            <div className="mb-6">
                                <h3 className="mb-4 text-lg font-medium">{t('Existing Documents')}</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {existingDocuments.map((document: any) => (
                                        <Card key={document.id} className="border">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <h4 className="font-medium">{document.document_type?.name}</h4>
                                                            <p className="text-muted-foreground text-sm">
                                                                {document.expiry_date
                                                                    ? `${t('Expires')}: ${new Date(document.expiry_date).toLocaleDateString()}`
                                                                    : t('No expiry date')}
                                                            </p>
                                                            <div className={`mt-2 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                                                document.verification_status === 'verified'
                                                                    ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset'
                                                                    : document.verification_status === 'rejected'
                                                                      ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20 ring-inset'
                                                                      : 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20 ring-inset'
                                                            }`}>
                                                                {document.verification_status === 'verified'
                                                                    ? t('Verified')
                                                                    : document.verification_status === 'rejected'
                                                                      ? t('Rejected')
                                                                      : t('Pending')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <Button variant="outline" size="sm"
                                                            onClick={() => window.open(`${document.file_path}`, '_blank')}>
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="outline" size="sm"
                                                            onClick={() => removeExistingDocument(document.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Documents */}
                        <div>
                            <h3 className="mb-4 text-lg font-medium">{t('Add New Documents')}</h3>
                            {newDocuments.map((document: any, index: number) => (
                                <div key={index} className="mb-4 space-y-4 rounded-md border p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium">{t('Document')} #{index + 1}</h3>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeNewDocument(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor={`document_type_${index}`}>
                                                {t('Document Type')} <span className="text-red-500">*</span>
                                            </Label>
                                            <Select value={document.document_type_id}
                                                onValueChange={(value) => handleNewDocumentChange(index, 'document_type_id', value)}>
                                                <SelectTrigger className={errors[`documents.${index}.document_type_id`] ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder={t('Select Document Type')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {documentTypes.map((type: any) => (
                                                        <SelectItem key={type.id} value={type.id.toString()}>
                                                            {type.name} {type.is_required && <span className="text-red-500">*</span>}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors[`documents.${index}.document_type_id`] && (
                                                <p className="text-xs text-red-500">{errors[`documents.${index}.document_type_id`]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('File')} <span className="text-red-500">*</span></Label>
                                            <div className="flex flex-col gap-3">
                                                <div className="bg-muted/30 flex h-20 items-center justify-center rounded-md border p-4">
                                                    {document.file_path ? (
                                                        <img src={getImagePath(document.file_path)} alt="Document Preview"
                                                            className="max-h-full max-w-full object-contain" />
                                                    ) : (
                                                        <div className="text-muted-foreground flex flex-col items-center gap-1">
                                                            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded border border-dashed">
                                                                <span className="text-muted-foreground text-xs font-semibold">{t('Doc')}</span>
                                                            </div>
                                                            <span className="text-xs">No file selected</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <MediaPicker label="" value={document.file_path || ''}
                                                    onChange={(url) => handleNewDocumentChange(index, 'file_path', url)}
                                                    placeholder="Select document file..." showPreview={false} />
                                            </div>
                                            {errors[`documents.${index}.file`] && (
                                                <p className="text-xs text-red-500">{errors[`documents.${index}.file`]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`document_expiry_${index}`}>{t('Expiry Date')}</Label>
                                            <div className="cursor-pointer" onClick={(e) => {
                                                const input = (e.currentTarget as HTMLElement).querySelector('input');
                                                try { (input as any)?.showPicker?.(); } catch { input?.focus(); }
                                            }}>
                                                <Input id={`document_expiry_${index}`} type="date"
                                                    value={document.expiry_date}
                                                    onChange={(e) => handleNewDocumentChange(index, 'expiry_date', e.target.value)}
                                                    className={`cursor-pointer ${errors[`documents.${index}.expiry_date`] ? 'border-red-500' : ''}`} />
                                            </div>
                                            {errors[`documents.${index}.expiry_date`] && (
                                                <p className="text-xs text-red-500">{errors[`documents.${index}.expiry_date`]}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button type="button" variant="outline" onClick={addNewDocument} className="mt-4">
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Document')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={() => router.get(route('hr.employees.index'))}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t('Saving...') : t('Update Employee')}
                    </Button>
                </div>
            </form>
        </PageTemplate>
    );
}