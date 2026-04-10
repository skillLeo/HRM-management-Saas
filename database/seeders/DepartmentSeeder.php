<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all companies
        $companies = User::where('type', 'company')->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No company users found. Please run DefaultCompanySeeder first.');
            return;
        }

        // Department names with descriptions
        $departments = [
            ['name' => 'Human Resources', 'description' => 'Manages employee relations, recruitment, training, benefits administration, and organizational development'],
            ['name' => 'Information Technology', 'description' => 'Responsible for managing IT infrastructure, software development, system maintenance, and technical support'],
            ['name' => 'Finance & Accounting', 'description' => 'Handles financial planning, budgeting, accounting, financial reporting, and compliance with financial regulations'],
            ['name' => 'Marketing', 'description' => 'Develops marketing strategies, manages brand promotion, digital marketing campaigns, and market research'],
            ['name' => 'Sales', 'description' => 'Focuses on revenue generation, client acquisition, customer relationship management, and sales target achievement'],
            ['name' => 'Operations', 'description' => 'Oversees daily business operations, process optimization, quality control, and operational efficiency'],
            ['name' => 'Customer Service', 'description' => 'Provides customer support, handles inquiries and complaints, and ensures customer satisfaction and retention'],
            ['name' => 'Research & Development', 'description' => 'Conducts research, develops new products and services, innovation management, and technology advancement'],
            ['name' => 'Legal', 'description' => 'Manages legal compliance, contract negotiations, risk management, and provides legal counsel to the organization'],
            ['name' => 'Administration', 'description' => 'Handles administrative functions, office management, documentation, and general administrative support services']
        ];

        foreach ($companies as $company) {
            // Create 3 departments per company
            $departmentCount = rand(2, 3);

            for ($i = 0; $i < $departmentCount; $i++) {
                $department = $departments[$i];

                // Check if department already exists for this company
                if (Department::where('name', $department['name'])
                    ->where('created_by', $company->id)
                    ->exists()) {
                    continue;
                }

                try {
                    Department::create([
                        'name' => $department['name'],
                        'description' => $department['description'],
                        'status' => 'active',
                        'created_by' => $company->id,
                    ]);
                } catch (\Exception $e) {
                    $this->command->error('Failed to create department: ' . $department['name'] . ' for company: ' . $company->name);
                    continue;
                }
            }
        }

        $this->command->info('Department seeder completed successfully!');
    }
}