<#
.SYNOPSIS
Prompts the user to enter a task and echoes it back to the terminal.

.DESCRIPTION
If an argument is supplied, it will be used as the task text and echoed immediately.
If no argument is supplied the script will prompt the user with "Enter your task" and read a line from stdin.

.EXAMPLE
./enter-task.ps1
Enter your task: Buy milk
You entered: Buy milk

.EXAMPLE (non-interactive)
./enter-task.ps1 "Buy milk"
You entered: Buy milk
#>

param(
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Task
)

function Write-Result($text) {
    Write-Host "$text"
}

if ($Task) {
    Write-Result -text $Task
    exit 0
}

# No argument provided; prompt the user
Write-Host -NoNewline "Enter your task: "
$input = Read-Host
if ([string]::IsNullOrWhiteSpace($input)) {
    Write-Host "No task entered. Exiting with code 1." -ForegroundColor Yellow
    exit 1
}

Write-Result -text $input
