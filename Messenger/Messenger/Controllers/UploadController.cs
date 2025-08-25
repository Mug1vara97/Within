using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Threading.Tasks;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadController : ControllerBase
    {
        private readonly string _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");

        [HttpPost("audio")]
        public async Task<IActionResult> UploadAudio(IFormFile file)
        {
            if (!Directory.Exists(_uploadPath))
                Directory.CreateDirectory(_uploadPath);

            var fileName = $"{Guid.NewGuid()}.wav";
            var filePath = Path.Combine(_uploadPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { url = $"/Uploads/{fileName}" });
        }
    }
}