<?php $__env->startSection('template_title'); ?>
    <?php echo e(trans('installer_messages.permissions.templateTitle')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('title'); ?>
    <i class="fas fa-shield-alt mr-2"></i>
    <?php echo e(trans('installer_messages.permissions.title')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('container'); ?>
    <div class="mb-6">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center">
                <i class="fas fa-info-circle text-green-600 mr-3"></i>
                <p class="text-green-800">Checking folder permissions required for the application to function properly.</p>
            </div>
        </div>
    </div>

    <div class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i class="fas fa-folder-open mr-2 text-green-600"></i>
            Directory Permissions
        </h3>
        
        <div class="space-y-3">
            <?php $__currentLoopData = $permissions['permissions']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $permission): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div class="flex items-center justify-between p-4 bg-white rounded-lg border <?php echo e($permission['isSet'] ? 'border-green-200' : 'border-red-200'); ?>">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full <?php echo e($permission['isSet'] ? 'bg-green-100' : 'bg-red-100'); ?> flex items-center justify-center mr-3">
                            <i class="fas fa-<?php echo e($permission['isSet'] ? 'check' : 'times'); ?> <?php echo e($permission['isSet'] ? 'text-green-600' : 'text-red-600'); ?>"></i>
                        </div>
                        <div>
                            <span class="font-medium text-gray-900"><?php echo e($permission['folder']); ?></span>
                            <div class="text-sm text-gray-500">Required for file operations</div>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <span class="px-3 py-1 text-sm font-medium rounded-full <?php echo e($permission['isSet'] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'); ?>">
                            <?php echo e($permission['permission']); ?>

                        </span>
                    </div>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    </div>

    <?php if( ! isset($permissions['errors'])): ?>
        <div class="text-center mt-8">
            <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center justify-center">
                    <i class="fas fa-check-circle text-green-600 mr-2"></i>
                    <span class="text-green-800 font-medium">All permissions are correctly set!</span>
                </div>
            </div>
            <a href="<?php echo e(route('LaravelInstaller::environment')); ?>" class="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200">
                <?php echo e(trans('installer_messages.permissions.next')); ?>

                <i class="fas fa-arrow-right ml-2"></i>
            </a>
        </div>
    <?php else: ?>
        <div class="text-center mt-8">
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center justify-center mb-2">
                    <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                    <span class="text-red-800 font-medium">Permission issues detected</span>
                </div>
                <p class="text-red-700 text-sm">Please fix the folder permissions above before continuing.</p>
            </div>
        </div>
    <?php endif; ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('vendor.installer.layouts.master', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Applications/XAMPP/htdocs/HRM-management-Saas/resources/views/vendor/installer/permissions.blade.php ENDPATH**/ ?>