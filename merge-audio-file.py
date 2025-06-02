import sys
import os
from pydub import AudioSegment

def getNumFile(fileName):
    return int(fileName.split(".")[0])

def mergeFile(dirFile,mergeFileName):
    audios = os.listdir(dirFile)
    #ถ้ามีไฟล์ audios จะไม่เป็น array ว่าง
    if not audios:
        print("No files in the folder.")
    else:
        audios = sorted(audios,key=getNumFile)
        try:
            audioFile = AudioSegment.from_file(f"{dirFile}/{audios[0]}")
            os.remove(f"{dirFile}/{audios[0]}")
            for i in audios[1:]:
                audioFile += AudioSegment.from_file(f"{dirFile}/{i}")
                os.remove(f"{dirFile}/{i}")
            audioFile.export(mergeFileName,format="wav")
            print("Merge audio files successful.")
        except Exception as e:
            print("Merging audio files failed.", e)

if __name__ == "__main__":
    dirFile = sys.argv[1]
    #print(dirFile)
    mergeFileName = sys.argv[2]
    #print(mergeFileName)
    mergeFile(dirFile,mergeFileName)