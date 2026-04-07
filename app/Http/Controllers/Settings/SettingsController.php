<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Currency;
use App\Models\PaymentSetting;
use App\Models\Webhook;
use App\Models\IpRestriction;
use App\Models\NocTemplate;
use App\Models\ExperienceCertificateTemplate;
use App\Models\JoiningLetterTemplate;

class SettingsController extends Controller
{
    public function index()
    {
        $systemSettings = settings();
        $currencies = Currency::all();
        $paymentSettings = PaymentSetting::getUserSettings(auth()->id());
        $webhooks = Webhook::where('user_id', auth()->id())->get();
        $ipRestrictions = IpRestriction::whereIn('created_by', getCompanyAndUsersId())
            ->orderBy('id', 'desc')->get();

        $zektoSettings = [
            'zkteco_api_url'    => $systemSettings['zkteco_api_url']    ?? '',
            'zkteco_username'   => $systemSettings['zkteco_username']   ?? '',
            'zkteco_password'   => $systemSettings['zkteco_password']   ?? '',
            'zkteco_auth_token' => $systemSettings['zkteco_auth_token'] ?? '',
        ];

        $nocTemplates                   = NocTemplate::where('created_by', Auth::id())->get();
        $joiningLetterTemplates         = JoiningLetterTemplate::where('created_by', Auth::id())->get();
        $experienceCertificateTemplates = ExperienceCertificateTemplate::where('created_by', Auth::id())->get();

        // Zambia Tax Settings
        // AFTER — replace with this
$zambiaDefaults = [
    'zambia_paye_slab_1_min'     => '0',
    'zambia_paye_slab_1_max'     => '5100',
    'zambia_paye_slab_1_rate'    => '0',
    'zambia_paye_slab_2_min'     => '5100.01',
    'zambia_paye_slab_2_max'     => '7100',
    'zambia_paye_slab_2_rate'    => '25',
    'zambia_paye_slab_3_min'     => '7100.01',
    'zambia_paye_slab_3_max'     => '9200',
    'zambia_paye_slab_3_rate'    => '30',
    'zambia_paye_slab_4_min'     => '9201.01',
    'zambia_paye_slab_4_max'     => '999999999',
    'zambia_paye_slab_4_rate'    => '35',
    'zambia_napsa_employee_rate' => '5',
    'zambia_napsa_employer_rate' => '5',
    'zambia_napsa_monthly_cap'   => '1073.20',
    'zambia_nhima_employee_rate' => '1',
    'zambia_nhima_employer_rate' => '1',
    'zambia_sdl_rate'            => '0.5',
];

$zambiaTaxSettings = array_merge(
    $zambiaDefaults,
    Setting::where('user_id', creatorId())
        ->where('key', 'like', 'zambia_%')
        ->pluck('value', 'key')
        ->toArray()
);

        return Inertia::render('settings/index', [
            'systemSettings'                  => $systemSettings,
            'settings'                        => $systemSettings,
            'cacheSize'                       => getCacheSize(),
            'currencies'                      => $currencies,
            'timezones'                       => config('timezones'),
            'dateFormats'                     => config('dateformat'),
            'timeFormats'                     => config('timeformat'),
            'paymentSettings'                 => $paymentSettings,
            'webhooks'                        => $webhooks,
            'zektoSettings'                   => $zektoSettings,
            'ipRestrictions'                  => $ipRestrictions,
            'nocTemplates'                    => $nocTemplates,
            'joiningLetterTemplates'          => $joiningLetterTemplates,
            'experienceCertificateTemplates'  => $experienceCertificateTemplates,
            'zambiaTaxSettings'               => $zambiaTaxSettings,
        ]);
    }
}