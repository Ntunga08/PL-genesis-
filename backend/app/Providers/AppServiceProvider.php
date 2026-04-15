<?php

namespace App\Providers;

use App\Repositories\MedicalRecordRepository;
use App\Services\IpfsService;
use App\Services\MedicalRecordService;
use App\Services\SorobanService;
use App\Services\StellarService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\AccountService::class);
        $this->app->singleton(\App\Services\PatientIdentityService::class);
        $this->app->singleton(IpfsService::class);
        $this->app->singleton(StellarService::class);
        $this->app->singleton(SorobanService::class);
        $this->app->singleton(MedicalRecordRepository::class);

        $this->app->singleton(MedicalRecordService::class, function ($app) {
            return new MedicalRecordService(
                $app->make(IpfsService::class),
                $app->make(StellarService::class),
                $app->make(SorobanService::class),
                $app->make(MedicalRecordRepository::class),
            );
        });

        $this->app->singleton(\App\Services\FiatToStellarBridgeService::class, function ($app) {
            return new \App\Services\FiatToStellarBridgeService(
                $app->make(StellarService::class),
                $app->make(SorobanService::class),
                $app->make(MedicalRecordRepository::class),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
