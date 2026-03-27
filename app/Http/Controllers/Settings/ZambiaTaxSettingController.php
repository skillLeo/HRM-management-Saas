<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ZambiaTaxSettingController extends Controller
{
    public function update(Request $request)
    {
        // if (!Auth::user()->can('manage-zambia-tax-settings')) {
        //     return redirect()->back()->with('error', __('Permission Denied.'));
        // }

        $validator = Validator::make($request->all(), [
            // PAYE Slabs
            'zambia_paye_slab_1_min'  => 'required|numeric|min:0',
            'zambia_paye_slab_1_max'  => 'required|numeric|min:0',
            'zambia_paye_slab_1_rate' => 'required|numeric|min:0|max:100',
            'zambia_paye_slab_2_min'  => 'required|numeric|min:0',
            'zambia_paye_slab_2_max'  => 'required|numeric|min:0',
            'zambia_paye_slab_2_rate' => 'required|numeric|min:0|max:100',
            'zambia_paye_slab_3_min'  => 'required|numeric|min:0',
            'zambia_paye_slab_3_max'  => 'required|numeric|min:0',
            'zambia_paye_slab_3_rate' => 'required|numeric|min:0|max:100',
            'zambia_paye_slab_4_min'  => 'required|numeric|min:0',
            'zambia_paye_slab_4_rate' => 'required|numeric|min:0|max:100',
            // NAPSA
            'zambia_napsa_employee_rate' => 'required|numeric|min:0|max:100',
            'zambia_napsa_employer_rate' => 'required|numeric|min:0|max:100',
            'zambia_napsa_monthly_cap'   => 'required|numeric|min:0',
            // NHIMA
            'zambia_nhima_employee_rate' => 'required|numeric|min:0|max:100',
            'zambia_nhima_employer_rate' => 'required|numeric|min:0|max:100',
            // SDL
            'zambia_sdl_rate' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $userId = creatorId();

        $keys = [
            'zambia_paye_slab_1_min', 'zambia_paye_slab_1_max', 'zambia_paye_slab_1_rate',
            'zambia_paye_slab_2_min', 'zambia_paye_slab_2_max', 'zambia_paye_slab_2_rate',
            'zambia_paye_slab_3_min', 'zambia_paye_slab_3_max', 'zambia_paye_slab_3_rate',
            'zambia_paye_slab_4_min', 'zambia_paye_slab_4_max', 'zambia_paye_slab_4_rate',
            'zambia_napsa_employee_rate', 'zambia_napsa_employer_rate', 'zambia_napsa_monthly_cap',
            'zambia_nhima_employee_rate', 'zambia_nhima_employer_rate',
            'zambia_sdl_rate',
        ];

        foreach ($keys as $key) {
            Setting::updateOrCreate(
                ['user_id' => $userId, 'key' => $key],
                ['value'   => $request->input($key)]
            );
        }

        return redirect()->back()->with('success', __('Zambia tax settings updated successfully.'));
    }
}