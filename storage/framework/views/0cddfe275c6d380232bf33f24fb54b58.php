<?php $__env->startSection('template_title'); ?>
    <?php echo e(trans('installer_messages.welcome.templateTitle')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('title'); ?>
    <?php echo e(trans('installer_messages.welcome.title')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('container'); ?>
    <div class="text-center">
        <div class="mb-8">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-rocket text-3xl text-green-600"></i>
            </div>
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">Welcome to the Installation Wizard</h2>
            <p class="text-gray-600 max-w-md mx-auto leading-relaxed">
                <?php echo e(trans('installer_messages.welcome.message')); ?>

            </p>
        </div>
        
        <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-medium text-gray-900 mb-2">What we'll set up:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div class="flex items-center">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        System Requirements
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        File Permissions
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Database Configuration
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Application Setup
                    </div>
                </div>
            </div>
            
            <a href="<?php echo e(route('LaravelInstaller::requirements')); ?>" class="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200">
                <?php echo e(trans('installer_messages.welcome.next')); ?>

                <i class="fas fa-arrow-right ml-2"></i>
            </a>
        </div>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('vendor.installer.layouts.master', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Applications/XAMPP/htdocs/HRM-management-Saas/resources/views/vendor/installer/welcome.blade.php ENDPATH**/ ?>