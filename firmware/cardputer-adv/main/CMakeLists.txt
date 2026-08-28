idf_component_register(
    SRCS "main.cpp"
    INCLUDE_DIRS "."
    REQUIRES agent_link m5unified
)

target_compile_options(${COMPONENT_LIB} PRIVATE -Wall -Wextra -Werror)
