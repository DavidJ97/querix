#include "QuerixCharacter.h"
#include "QuerixDecisionDoor.h"
#include "EngineUtils.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/InputComponent.h"
AQuerixCharacter::AQuerixCharacter(){
 bUseControllerRotationYaw=false;
 GetCharacterMovement()->bOrientRotationToMovement=true;
 CameraBoom=CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
 CameraBoom->SetupAttachment(RootComponent);
 CameraBoom->TargetArmLength=350.f;
 CameraBoom->bUsePawnControlRotation=true;
 FollowCamera=CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
 FollowCamera->SetupAttachment(CameraBoom,USpringArmComponent::SocketName);
 FollowCamera->bUsePawnControlRotation=false;
}
void AQuerixCharacter::Forward(float V){if(Controller && V!=0){FRotator R(0,Controller->GetControlRotation().Yaw,0);AddMovementInput(R.Vector(),V);}}
void AQuerixCharacter::Right(float V){if(Controller && V!=0){FRotator R(0,Controller->GetControlRotation().Yaw,0);AddMovementInput(FRotationMatrix(R).GetUnitAxis(EAxis::Y),V);}}
void AQuerixCharacter::SetupPlayerInputComponent(UInputComponent* I){
 Super::SetupPlayerInputComponent(I);
 I->BindAxis("MoveForward",this,&AQuerixCharacter::Forward);
 I->BindAxis("MoveRight",this,&AQuerixCharacter::Right);
 I->BindAxis("Turn",this,&APawn::AddControllerYawInput);
 I->BindAxis("LookUp",this,&APawn::AddControllerPitchInput);
 I->BindAction("Jump",IE_Pressed,this,&ACharacter::Jump);
 I->BindAction("Jump",IE_Released,this,&ACharacter::StopJumping);
 I->BindAction("Interact",IE_Pressed,this,&AQuerixCharacter::Interact);
}
void AQuerixCharacter::Interact(){
 AQuerixDecisionDoor* Best=nullptr; float Distance=200.f;
 for(TActorIterator<AQuerixDecisionDoor> It(GetWorld());It;++It){float D=FVector::Dist(GetActorLocation(),It->GetActorLocation());if(D<Distance){Distance=D;Best=*It;}}
 if(Best) Best->SelectAnswer(); else OnInteract();
}
