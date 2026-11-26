#include "QuerixArrow.h"
#include "Components/SphereComponent.h"
#include "GameFramework/ProjectileMovementComponent.h"
AQuerixArrow::AQuerixArrow(){
 Collision=CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
 SetRootComponent(Collision);
 Collision->InitSphereRadius(3.f);
 Collision->SetCollisionProfileName(TEXT("BlockAllDynamic"));
 Movement=CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Movement"));
 Movement->SetUpdatedComponent(Collision);
 Movement->bRotationFollowsVelocity=true;
 Movement->ProjectileGravityScale=1.f;
 Movement->bAutoActivate=false;
 InitialLifeSpan=8.f;
}
void AQuerixArrow::Launch(FVector Direction,float Power){
 if(Direction.IsNearlyZero() || Direction.ContainsNaN() || !FMath::IsFinite(Power)) return;
 Collision->IgnoreActorWhenMoving(GetOwner(),true);
 Movement->Velocity=Direction.GetSafeNormal()*FMath::Lerp(500.f,3000.f,FMath::Clamp(Power,0.f,1.f));
 Movement->Activate(true);
}