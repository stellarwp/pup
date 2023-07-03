# Command flow

```mermaid
flowchart TD
    clone[Clone repository recursively]
    build[Run build command]
    captureVersion[Capture version from version files]
    isDev{Is this a dev build?}
    generateDevVersion[Generate dev version number]
    updateVersionNumbers[Update version numbers in version files]
    generateZipName[Generate zip name]
    buildZipDir[Move files to dir to be zipped]
    runChecks[Run sanity checks]
    packageZip[Package zip]
    
    subgraph pup build
    clone --> build
    end
    subgraph pup check
    build --> runChecks
    end
    subgraph pup get-version
    runChecks --> captureVersion
    captureVersion --> isDev
    isDev --> |Yes| generateDevVersion
    end
    subgraph pup package
    generateDevVersion --> updateVersionNumbers
    isDev --> |No| generateZipName
    updateVersionNumbers --> generateZipName
    generateZipName --> buildZipDir
    buildZipDir --> packageZip
    end
    packageZip --> cleanup
```