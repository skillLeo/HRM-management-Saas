<?php $__env->startSection('template_title'); ?>
    <?php echo e(trans('installer_messages.requirements.templateTitle')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('title'); ?>
    <i class="fas fa-list-check mr-2"></i>
    <?php echo e(trans('installer_messages.requirements.title')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('container'); ?>
    <div class="space-y-6">
        <?php $__currentLoopData = $requirements['requirements']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $type => $requirement): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <div class="bg-gray-50 rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                        <i class="fas fa-<?php echo e($type == 'php' ? 'code' : 'server'); ?> mr-2 text-green-600"></i>
                        <?php echo e(ucfirst($type)); ?> Requirements
                        <?php if($type == 'php'): ?>
                            <span class="ml-2 text-sm font-normal text-gray-600">
                                (version <?php echo e($phpSupportInfo['minimum']); ?> required)
                            </span>
                        <?php endif; ?>
                    </h3>
                    <?php if($type == 'php'): ?>
                        <div class="flex items-center">
                            <span class="text-lg font-semibold <?php echo e($phpSupportInfo['supported'] ? 'text-green-600' : 'text-red-600'); ?> mr-2">
                                <?php echo e($phpSupportInfo['current']); ?>

                            </span>
                            <div class="w-8 h-8 rounded-full <?php echo e($phpSupportInfo['supported'] ? 'bg-green-100' : 'bg-red-100'); ?> flex items-center justify-center">
                                <i class="fas fa-<?php echo e($phpSupportInfo['supported'] ? 'check' : 'times'); ?> <?php echo e($phpSupportInfo['supported'] ? 'text-green-600' : 'text-red-600'); ?>"></i>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <?php $__currentLoopData = $requirements['requirements'][$type]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $extension => $enabled): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <div class="flex items-center justify-between p-3 bg-white rounded border <?php echo e($enabled ? 'border-green-200' : 'border-red-200'); ?>">
                            <span class="font-medium text-gray-700"><?php echo e($extension); ?></span>
                            <div class="w-6 h-6 rounded-full <?php echo e($enabled ? 'bg-green-100' : 'bg-red-100'); ?> flex items-center justify-center">
                                <i class="fas fa-<?php echo e($enabled ? 'check' : 'times'); ?> text-sm <?php echo e($enabled ? 'text-green-600' : 'text-red-600'); ?>"></i>
                            </div>
                        </div>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </div>
            </div>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </div>

    <?php if( ! isset($requirements['errors']) && $phpSupportInfo['supported'] ): ?>
        <div class="text-center mt-8">
            <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center justify-center">
                    <i class="fas fa-check-circle text-green-600 mr-2"></i>
                    <span class="text-green-800 font-medium">All requirements are satisfied!</span>
                </div>
            </div>
            <a href="<?php echo e(route('LaravelInstaller::permissions')); ?>" class="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200">
                <?php echo e(trans('installer_messages.requirements.next')); ?>

                <i class="fas fa-arrow-right ml-2"></i>
            </a>
        </div>
    <?php else: ?>
        <div class="text-center mt-8">
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center justify-center">
                    <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                    <span class="text-red-800 font-medium">Please fix the requirements above before continuing.</span>
                </div>
            </div>
        </div>
    <?php endif; ?>
<?php $__env->stopSection(); ?>
<?php echo $__env->make('vendor.installer.layouts.master', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Applications/XAMPP/htdocs/HRM-management-Saas/resources/views/vendor/installer/requirements.blade.php ENDPATH**/ ?>