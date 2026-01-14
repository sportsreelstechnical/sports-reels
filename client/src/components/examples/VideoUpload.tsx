import VideoUpload from "../VideoUpload";

export default function VideoUploadExample() {
  return (
    <div className="max-w-md">
      <VideoUpload 
        onUpload={(file, meta) => console.log("Upload", file.name, meta)}
        onIntegrationConnect={(source) => console.log("Connect", source)}
      />
    </div>
  );
}
