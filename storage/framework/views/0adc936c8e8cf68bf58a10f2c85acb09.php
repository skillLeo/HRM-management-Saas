<?php $__env->startSection('template_title'); ?>
    <?php echo e(trans('installer_messages.environment.menu.templateTitle')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('title'); ?>
    <i class="fas fa-cogs mr-2"></i>
    <?php echo trans('installer_messages.environment.menu.title'); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('container'); ?>
    <div class="text-center mb-8">
        <p class="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            <?php echo trans('installer_messages.environment.menu.desc'); ?>

        </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <!-- Wizard Option -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200 hover:shadow-lg transition-all duration-200">
            <div class="text-center">
                <div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-magic text-2xl text-white"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3"><?php echo e(trans('installer_messages.environment.menu.wizard-button')); ?></h3>
                <p class="text-gray-600 mb-6 text-sm leading-relaxed">
                    Guided setup with step-by-step configuration. Perfect for beginners and quick installations.
                </p>
                <div class="space-y-2 mb-6">
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Easy form-based setup
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Automatic validation
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Recommended for most users
                    </div>
                </div>
                <a href="<?php echo e(route('LaravelInstaller::environmentWizard')); ?>" class="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 w-full justify-center">
                    <i class="fas fa-magic mr-2"></i>
                    Use Wizard Setup
                </a>
            </div>
        </div>

        <!-- Classic Option -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
            <div class="text-center">
                <div class="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-code text-2xl text-white"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3"><?php echo e(trans('installer_messages.environment.menu.classic-button')); ?></h3>
                <p class="text-gray-600 mb-6 text-sm leading-relaxed">
                    Manual configuration by editing the .env file directly. For advanced users who prefer full control.
                </p>
                <div class="space-y-2 mb-6">
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Direct .env file editing
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        Full configuration control
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        For advanced users
                    </div>
                </div>
                <a href="<?php echo e(route('LaravelInstaller::environmentWizard')); ?>" class="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 w-full justify-center">
                    <i class="fas fa-code mr-2"></i>
                    Use Classic Setup
                </a>
            </div>
        </div>
    </div>

    <div class="text-center mt-8">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
            <div class="flex items-center justify-center">
                <i class="fas fa-lightbulb text-yellow-600 mr-2"></i>
                <span class="text-yellow-800 text-sm font-medium">Recommendation: Use the Wizard setup for the best experience</span>
            </div>
        </div>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('vendor.installer.layouts.master', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Applications/XAMPP/htdocs/HRM-management-Saas/resources/views/vendor/installer/environment.blade.php ENDPATH**/ ?>