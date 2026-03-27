<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip - {{ $payrollEntry->employee->name }}</title>
    <style>
        body { font-family: "DejaVu Sans", sans-serif; font-size: 11px; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; border: 1px solid #333; padding: 0; }
        .header { position: relative; text-align: center; padding: 15px; border-bottom: 1px solid #333; }
        .header-qr { position: absolute; top: 10px; right: 10px; }
        .header-qr img { width: 70px; height: 70px; }
        .header-qr-label { font-size: 8px; color: #555; text-align: center; margin-top: 2px; }
        .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .payslip-title { font-size: 14px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { font-weight: bold; background-color: #fafafa; }
        .section-header { background-color: #f5f5f5; font-weight: bold; text-align: center; }
        .amount { text-align: right; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .net-salary-row { font-weight: bold; font-size: 13px; background-color: #e8f5e9; }
        .employer-row { background-color: #fff8e1; }
        .zambia-label { color: #555; font-size: 10px; }
        .footer { padding: 10px; font-size: 10px; border-top: 1px solid #ccc; }
        .footer-inner { display: flex; justify-content: space-between; align-items: center; }
        .footer-center { text-align: center; flex: 1; }
        .footer-tagline { text-align: right; font-size: 10px; }
        .footer-tagline a { color: #1a73e8; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
<div class="container" id="payslip-content">

    {{-- ── HEADER ─────────────────────────────────────────────────────────── --}}
    <div class="header">

        {{-- QR Code — top right --}}
        <div class="header-qr">
            {!! QrCode::size(70)->generate('https://www.afripay-hr.co.zm') !!}
            <div class="header-qr-label">ESS Portal</div>
        </div>

        <div class="company-name">
            {{ $companySettings['titleText'] ?? config('app.name', 'HRMGo SaaS') }}
        </div>
        @if (!empty($companySettings['companyAddress']))
            <div style="font-size:10px;margin-top:5px;">{{ $companySettings['companyAddress'] }}</div>
        @endif
        <div style="font-size:10px;margin-top:3px;">
            @if (!empty($companySettings['companyEmail']))Email: {{ $companySettings['companyEmail'] }}@endif
            @if (!empty($companySettings['companyMobile'])) | Phone: {{ $companySettings['companyMobile'] }}@endif
        </div>
        <div class="payslip-title" style="margin-top:10px;">Salary Slip</div>
        <div>{{ $payrollEntry->payrollRun->pay_period_start->format('F Y') }}</div>
    </div>

    {{-- ── EMPLOYEE INFORMATION ────────────────────────────────────────────── --}}
    <table>
        <tr><th colspan="4" class="section-header">Employee Information</th></tr>
        <tr>
            <td width="20%"><strong>Employee Name</strong></td>
            <td width="30%">{{ $payrollEntry->employee->name }}</td>
            <td width="20%"><strong>Employee ID</strong></td>
            <td width="30%">{{ $employeeData->employee_id ?? $payrollEntry->employee->id }}</td>
        </tr>
        <tr>
            <td><strong>Department</strong></td>
            <td>{{ $employeeData->department->name ?? 'N/A' }}</td>
            <td><strong>Pay Period</strong></td>
            <td>
                {{ $payrollEntry->payrollRun->pay_period_start->format('d M Y') }} –
                {{ $payrollEntry->payrollRun->pay_period_end->format('d M Y') }}
            </td>
        </tr>
        <tr>
            <td><strong>TPIN (Tax ID)</strong></td>
            <td>{{ $employeeData?->tpin ?? 'N/A' }}</td>
            <td><strong>NAPSA Number</strong></td>
            <td>{{ $employeeData?->napsa_number ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td><strong>NHIMA Number</strong></td>
            <td>{{ $employeeData?->nhima_number ?? 'N/A' }}</td>
            <td><strong>Generated On</strong></td>
            <td>{{ now()->format('d M Y') }}</td>
        </tr>
        @if (!empty($employeeData->bank_name) || !empty($employeeData->account_number))
        <tr>
            <td><strong>Bank Name</strong></td>
            <td>{{ $employeeData->bank_name ?? 'N/A' }}</td>
            <td><strong>Account Number</strong></td>
            <td>{{ $employeeData->account_number ?? 'N/A' }}</td>
        </tr>
        @endif
    </table>

    {{-- ── ATTENDANCE ──────────────────────────────────────────────────────── --}}
    @if ($payrollEntry->working_days > 0)
    <table>
        <tr><th colspan="6" class="section-header">Attendance Summary</th></tr>
        <tr>
            <td><strong>Working Days</strong><br>{{ $payrollEntry->working_days }}</td>
            <td><strong>Present</strong><br>{{ $payrollEntry->present_days }}</td>
            <td><strong>Paid Leave</strong><br>{{ $payrollEntry->paid_leave_days }}</td>
            <td><strong>Unpaid Leave</strong><br>{{ $payrollEntry->unpaid_leave_days }}</td>
            <td><strong>Half Days</strong><br>{{ $payrollEntry->half_days }}</td>
            <td><strong>Absent</strong><br>{{ $payrollEntry->absent_days }}</td>
        </tr>
        <tr>
            <td colspan="6"><strong>Overtime Hours:</strong> {{ number_format($payrollEntry->overtime_hours, 1) }}h</td>
        </tr>
    </table>
    @endif

    {{-- ── EARNINGS & DEDUCTIONS ───────────────────────────────────────────── --}}
    @php
        $rawEarnings    = $payrollEntry->earnings_breakdown ?? [];
        $rawDeductions  = $payrollEntry->deductions_breakdown ?? [];

        $earningsList = [];
        foreach ($rawEarnings as $k => $v) {
            if (is_array($v) && isset($v['name'])) {
                if (in_array($v['type'] ?? '', ['zambia_napsa_employer','zambia_nhima_employer','zambia_sdl'])) continue;
                $earningsList[] = ['name' => $v['name'], 'amount' => $v['amount']];
            } else {
                $earningsList[] = ['name' => $k, 'amount' => $v];
            }
        }

        $deductionsList = [];
        foreach ($rawDeductions as $k => $v) {
            if (is_array($v) && isset($v['name'])) {
                $deductionsList[] = ['name' => $v['name'], 'amount' => $v['amount']];
            } else {
                $deductionsList[] = ['name' => $k, 'amount' => $v];
            }
        }

        if ($payrollEntry->overtime_amount > 0) {
            $earningsList[] = ['name' => 'Overtime Amount', 'amount' => $payrollEntry->overtime_amount];
        }

        if (($payrollEntry->unpaid_leave_deduction ?? 0) > 0) {
            $deductionsList[] = ['name' => 'Unpaid Leave Deduction', 'amount' => $payrollEntry->unpaid_leave_deduction];
        }

        $maxRows         = max(count($earningsList), count($deductionsList), 1);
        $totalEarnings   = $payrollEntry->total_earnings + $payrollEntry->overtime_amount;
        $totalDeductions = $payrollEntry->total_deductions + ($payrollEntry->unpaid_leave_deduction ?? 0);

        $employerItems = [];
        foreach ($rawEarnings as $k => $v) {
            if (is_array($v) && in_array($v['type'] ?? '', ['zambia_napsa_employer','zambia_nhima_employer','zambia_sdl'])) {
                $employerItems[] = $v;
            }
        }
    @endphp

    <table>
        <tr><th colspan="4" class="section-header">Salary Details</th></tr>
        <tr>
            <th width="35%">Earnings</th>
            <th width="15%" class="amount">Amount (ZMW)</th>
            <th width="35%">Deductions</th>
            <th width="15%" class="amount">Amount (ZMW)</th>
        </tr>

        @for ($i = 0; $i < $maxRows; $i++)
        <tr>
            <td>{{ $earningsList[$i]['name'] ?? '' }}</td>
            <td class="amount">{{ isset($earningsList[$i]) ? formatCurrency($earningsList[$i]['amount']) : '' }}</td>
            <td>{{ $deductionsList[$i]['name'] ?? '' }}</td>
            <td class="amount">{{ isset($deductionsList[$i]) ? formatCurrency($deductionsList[$i]['amount']) : '' }}</td>
        </tr>
        @endfor

        <tr class="total-row">
            <td><strong>Total Earnings</strong></td>
            <td class="amount"><strong>{{ formatCurrency($totalEarnings) }}</strong></td>
            <td><strong>Total Deductions</strong></td>
            <td class="amount"><strong>{{ formatCurrency($totalDeductions) }}</strong></td>
        </tr>
        <tr class="net-salary-row">
            <td colspan="3"><strong>NET PAY</strong></td>
            <td class="amount"><strong>{{ formatCurrency($payrollEntry->net_pay) }}</strong></td>
        </tr>
    </table>

    {{-- ── EMPLOYER CONTRIBUTIONS ──────────────────────────────────────────── --}}
    @if (count($employerItems) > 0)
    <table style="margin-top:8px;">
        <tr><th colspan="2" class="section-header">Employer Contributions (HR Record — Not Deducted from Employee)</th></tr>
        @foreach ($employerItems as $item)
        <tr class="employer-row">
            <td>{{ $item['name'] }}</td>
            <td class="amount">{{ formatCurrency($item['amount']) }}</td>
        </tr>
        @endforeach
    </table>
    @endif

    {{-- ── FOOTER ─────────────────────────────────────────────────────────── --}}
    <div class="footer">
        <div class="footer-inner">
            <div style="width:80px;"></div>
            <div class="footer-center">
                <p style="margin:0;"><strong>This is a computer-generated payslip and does not require a signature.</strong></p>
                <p style="margin:4px 0 0;">For any queries, please contact the HR department.</p>
            </div>
            <div class="footer-tagline">
                <a href="https://www.afripay-hr.co.zm" target="_blank">www.afripay-hr.co.zm</a>
            </div>
        </div>
    </div>

</div>
</body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
    window.addEventListener('load', function () {
        var element  = document.querySelector('.container');
        var filename = 'payslip-{{ $payrollEntry->employee->name }}-{{ $payrollEntry->payrollRun->pay_period_start->format("M-Y") }}.pdf';
        var opt = {
            margin:     0.3,
            filename:   filename,
            image:      { type: 'jpeg', quality: 1 },
            html2canvas:{ scale: 2, dpi: 192, letterRendering: true },
            jsPDF:      { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(function () {
            setTimeout(function () {
                window.location.href = '{{ route('hr.payslips.index') }}';
            }, 1000);
        });
    });
</script>
</html>