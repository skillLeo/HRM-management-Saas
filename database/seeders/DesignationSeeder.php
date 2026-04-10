<?php

namespace Database\Seeders;

use App\Models\Designation;
use App\Models\User;
use Illuminate\Database\Seeder;

class DesignationSeeder extends Seeder
{
    public function run(): void
    {
        // Get all companies
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found. Please run DefaultCompanySeeder first.');
            return;
        }

        // Designation names and descriptions
        $designations = [
            ['name' => 'HR Manager', 'description' => 'Oversees all HR functions including recruitment, employee relations, and policy implementation'],
            ['name' => 'Software Developer', 'description' => 'Designs, develops, and maintains software applications and systems'],
            ['name' => 'Finance Manager', 'description' => 'Oversees financial planning, budgeting, and financial reporting activities'],
            ['name' => 'Marketing Manager', 'description' => 'Develops marketing strategies, manages campaigns, and oversees brand promotion'],
            ['name' => 'Sales Manager', 'description' => 'Leads sales team, develops sales strategies, and manages client relationships'],
            ['name' => 'Operations Manager', 'description' => 'Oversees daily operations, ensures efficiency, and manages operational processes'],
            ['name' => 'Customer Service Manager', 'description' => 'Manages customer service team, handles escalations, and ensures customer satisfaction'],
            ['name' => 'Legal Manager', 'description' => 'Manages legal affairs, oversees contracts, and ensures regulatory compliance'],
            ['name' => 'Admin Manager', 'description' => 'Oversees administrative functions, manages office operations, and ensures smooth workflow'],
            ['name' => 'R&D Manager', 'description' => 'Leads research initiatives, manages R&D projects, and drives innovation strategies'],
        ];

        foreach ($companies as $company) {
            $designationCount = rand(2, 3);

            for ($i = 0; $i < $designationCount; $i++) {
                $designation = $designations[$i];

                // Check if designation already exists for this company
                if (Designation::where('name', $designation['name'])
                    ->where('created_by', $company->id)
                    ->exists()) {
                    continue;
                }

                try {
                    Designation::create([
                        'name' => $designation['name'],
                        'description' => $designation['description'],
                        'status' => 'active',
                        'created_by' => $company->id,
                    ]);
                } catch (\Exception $e) {
                    $this->command->error('Failed to create designation: ' . $designation['name'] . ' for company: ' . $company->name);
                    continue;
                }
            }
        }

        $this->command->info('Designation seeder completed successfully!');
    }
}